param()

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Write-Result($value) {
    $value | ConvertTo-Json -Depth 8 -Compress
}

function Await-WindowsRuntime($operation) {
    $operationType = [Windows.Media.SpeechSynthesis.SpeechSynthesisStream, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime]
    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object { $_.Name -eq 'AsTask' -and $_.ToString() -match 'IAsyncOperation`1\[TResult\]\)' } |
        Select-Object -First 1
    if ($null -eq $method) { throw 'Windows Runtime async bridge is unavailable.' }
    $task = $method.MakeGenericMethod($operationType).Invoke($null, @($operation))
    return $task.GetAwaiter().GetResult()
}

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    # Read an ASCII-safe base64 envelope so redirected Windows PowerShell stdin
    # cannot reinterpret Devanagari using the active system code page.
    $encodedRequest = [Console]::In.ReadToEnd().Trim()
    $requestJson = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encodedRequest))
    $request = $requestJson | ConvertFrom-Json
    $synthesizerType = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime]

    if ($request.action -eq 'list') {
        $voices = @($synthesizerType::AllVoices | ForEach-Object {
            [ordered]@{
                id = [string]$_.Id
                name = [string]$_.DisplayName
                language = [string]$_.Language
                gender = [string]$_.Gender
                description = [string]$_.Description
            }
        })
        Write-Result @{ voices = $voices }
        exit 0
    }

    if ($request.action -ne 'synthesize') { throw 'Unsupported Windows speech action.' }
    if ([string]::IsNullOrWhiteSpace([string]$request.text)) { throw 'Text cannot be empty.' }
    if ([string]$request.text.Length -gt 5000) { throw 'Text exceeds the 5000 character limit.' }
    if ([string]$request.voice_id -notmatch '^[^\r\n]{1,512}$') { throw 'Invalid Windows voice id.' }
    if ([string]$request.output_path -notmatch '\.wav$') { throw 'Output must be a WAV file.' }

    $voice = @($synthesizerType::AllVoices | Where-Object { $_.Id -eq [string]$request.voice_id }) | Select-Object -First 1
    if ($null -eq $voice) { throw 'The requested Windows Runtime voice is not installed.' }
    if ([string]$voice.Language -ne 'hi-IN') { throw 'The requested voice is not a Hindi (India) voice.' }

    $synthesizer = [Activator]::CreateInstance($synthesizerType)
    $synthesizer.Voice = $voice
    $stream = Await-WindowsRuntime ($synthesizer.SynthesizeTextToStreamAsync([string]$request.text))
    $reader = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
    $outputPath = [System.IO.Path]::GetFullPath([string]$request.output_path)
    $output = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try { $reader.CopyTo($output) } finally { $output.Dispose(); $reader.Dispose(); $stream.Dispose(); $synthesizer.Dispose() }
    # Return the completed WAV as base64 as well as metadata. Keeping the final
    # file write in Python avoids cross-process temp-file visibility issues in
    # ASGI worker processes while preserving the Windows Runtime synthesis path.
    $audio = [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes($outputPath))
    Write-Result @{ output_path = $outputPath; voice_id = [string]$voice.Id; language = [string]$voice.Language; audio_base64 = $audio }
    exit 0
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}

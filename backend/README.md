# Voxora AI Windows Speech Backend

This directory contains the local speech service used by Voxora AI (also named
Vanni AI in parts of the source code). It exposes a FastAPI HTTP API and uses
installed Windows speech engines. No cloud account, API key, or external TTS
service is required.

## What this backend does

- Lists voices installed on the machine.
- Generates English and other SAPI5-supported speech with `pyttsx3`.
- Generates Hindi (`hi-IN`) speech with the Windows Runtime
  `Windows.Media.SpeechSynthesis` API.
- Validates the requested language and voice together.
- Returns generated audio as a WAV response.
- Removes temporary WAV files after the HTTP response is completed.

Marathi (`mr-IN`) is exposed as a supported language by the API, but synthesis
requires a compatible installed voice. Hindi Runtime voices are discovered by
[`windows_speech.py`](./windows_speech.py); English and SAPI5 voice discovery
are implemented in [`main.py`](./main.py).

## Requirements

- Windows 10 or Windows 11
- Python 3.10 or newer
- Installed Windows speech voices
- PowerShell (Windows PowerShell is used by `windows_speech.ps1`)

For Hindi, install the Hindi language pack and speech voice from:

`Settings > Time & language > Language & region > Hindi > Language options > Speech`

Restart the backend after installing or changing voices.

## Installation

From this directory, create and activate a virtual environment, then install
the pinned dependencies:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

The dependency list is intentionally small:

- `fastapi` — HTTP API framework
- `uvicorn` — ASGI server
- `pyttsx3` — local SAPI5 integration for non-Hindi voices

## Start the service

Run the module directly:

```powershell
python main.py
```

Or run it from the project root:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The default address is `http://127.0.0.1:8000`. Set `VANNI_PORT` to change the
port when using `python main.py`:

```powershell
$env:VANNI_PORT = "8010"
python main.py
```

The frontend development server is expected to run at `http://localhost:5173`
or `http://127.0.0.1:5173`; those origins are allowed by the backend CORS
configuration.

## HTTP API

### Health check

```http
GET /api/health
```

Successful response:

```json
{"ok": true}
```

### Discover voices

```http
GET /api/voices
```

The response contains a `voices` array and a `languages` availability array.
Runtime Hindi voices include `engine: "windows-runtime"`, `language: "hi-IN"`,
gender, accent, and Windows voice metadata. If Windows Runtime discovery fails,
the response still contains SAPI5 voices and includes a `runtime_error` field.

Example PowerShell request:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/voices | ConvertTo-Json -Depth 8
```

### Generate WAV audio

```http
POST /api/tts
Content-Type: application/json
```

Request fields:

| Field | Type | Required | Details |
| --- | --- | --- | --- |
| `text` | string | yes | 1–5000 characters; whitespace-only text is rejected |
| `voice_id` | string | yes | ID returned by `/api/voices` |
| `language` | string | no | `en-US` by default; `hi-IN` and `mr-IN` are also recognized |
| `speed` | number | no | `0.5`–`1.6`; used by the SAPI5 path |

Hindi example:

```powershell
$body = @{
  text = "यह हिंदी में एक परीक्षण वाक्य है।"
  voice_id = "<installed-hi-IN-voice-id>"
  language = "hi-IN"
  speed = 1.0
} | ConvertTo-Json

Invoke-WebRequest -Uri http://127.0.0.1:8000/api/tts `
  -Method Post -ContentType 'application/json' -Body $body `
  -OutFile .\vanni-hindi.wav
```

The response has media type `audio/wav`. Invalid language/voice combinations
return HTTP 400. Engine failures return HTTP 500 with an actionable message.

## Windows Runtime implementation

[`windows_speech.py`](./windows_speech.py) is a Python wrapper around
[`windows_speech.ps1`](./windows_speech.ps1):

1. Python validates that it is running on Windows and that the helper exists.
2. It serializes the request as UTF-8 JSON and base64-encodes it. This keeps
   Devanagari text safe from Windows PowerShell code-page conversion.
3. PowerShell discovers voices or synthesizes text with
   `SpeechSynthesizer.SynthesizeTextToStreamAsync`.
4. PowerShell returns compact JSON. For synthesis, the WAV is also returned as
   base64.
5. Python decodes the audio, verifies a RIFF/WAV header, writes the output file,
   and returns metadata to the FastAPI route.

The wrapper serializes speech operations with a process lock because `pyttsx3`
engines are not thread-safe and Windows voice access should remain predictable.
Each helper call has a 30-second timeout by default.

## Python module reference

### `WindowsSpeechError`

Raised for platform, helper-process, validation, JSON, timeout, and audio-format
errors. The FastAPI layer converts these errors into HTTP responses.

### `list_voices() -> list[dict]`

Returns all voices reported by Windows Runtime, including IDs, display names,
language tags, gender, and descriptions.

### `list_hindi_voices() -> list[dict]`

Filters `list_voices()` to the `hi-IN` locale.

### `synthesize_hindi(text, voice_id, output_path) -> dict`

Validates the text length and selected Hindi voice, invokes the PowerShell
bridge, verifies the returned WAV payload, writes `output_path`, and returns
helper metadata.

## Troubleshooting

### `Windows Runtime speech is available only on Windows.`

The Hindi path cannot run on Linux, macOS, WSL, or a non-Windows CI runner.
Use the SAPI5 path on a supported Windows host.

### `Windows speech helper is missing`

Keep `windows_speech.py` and `windows_speech.ps1` in the same `backend`
directory. Do not rename the PowerShell helper without updating `HELPER`.

### No Hindi voices are listed

Install the Hindi speech voice in Windows Language options, then restart the
backend and call `/api/voices` again. The selected voice must report exactly
`hi-IN`.

### PowerShell or async bridge errors

Run the backend from a normal Windows installation with Windows PowerShell
available on `PATH`. The helper uses `System.Runtime.WindowsRuntime` and the
Windows Runtime speech assemblies supplied by Windows.

### Audio is not generated

Check the backend log, confirm that the voice ID came from the latest
`/api/voices` response, and ensure the text is no longer than 5000 characters.
The wrapper rejects payloads that are not valid RIFF/WAV data.

## Verification commands

Syntax-check the Python files:

```powershell
python -m py_compile main.py windows_speech.py
```

Check the running service:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/voices
```

There is currently no dedicated backend test suite. End-to-end verification
requires Windows speech voices because both synthesis engines are machine-local.

## Security and operational notes

- The service binds to `127.0.0.1` by default and is intended for local use.
- Do not expose it publicly without adding authentication, origin controls, and
  request-rate limits.
- Voice IDs and output paths are validated before they reach the PowerShell
  helper.
- Temporary audio files are created in the system temporary directory and are
  scheduled for deletion after the response is sent.
- The service sends text to local Windows speech APIs; it does not call a cloud
  speech provider.

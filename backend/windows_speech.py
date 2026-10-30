"""Windows Runtime speech synthesis service for voices unavailable to pyttsx3."""
import json
import base64
import os
import subprocess
from pathlib import Path


class WindowsSpeechError(RuntimeError):
    """Raised when the Windows Runtime speech helper cannot complete an operation."""


HELPER = Path(__file__).with_name("windows_speech.ps1")
HINDI_LANGUAGE = "hi-IN"


def _run(request: dict, timeout: int = 30) -> dict:
    if os.name != "nt":
        raise WindowsSpeechError("Windows Runtime speech is available only on Windows.")
    if not HELPER.exists():
        raise WindowsSpeechError(f"Windows speech helper is missing: {HELPER.name}")

    command = [
        "powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive",
        "-ExecutionPolicy", "Bypass", "-File", str(HELPER),
    ]
    try:
        result = subprocess.run(
            command,
            input=base64.b64encode(json.dumps(request, ensure_ascii=False).encode("utf-8")).decode("ascii"),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except subprocess.TimeoutExpired as exc:
        raise WindowsSpeechError(f"Windows speech timed out after {timeout} seconds.") from exc
    except OSError as exc:
        raise WindowsSpeechError(f"Could not start Windows speech helper: {exc}") from exc

    if result.returncode != 0:
        message = (result.stderr or result.stdout).strip() or "Windows speech helper failed."
        raise WindowsSpeechError(message)
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise WindowsSpeechError("Windows speech helper returned invalid JSON.") from exc


def list_voices() -> list[dict]:
    """Return the installed Windows Runtime voices and their metadata."""
    return _run({"action": "list"}).get("voices", [])


def list_hindi_voices() -> list[dict]:
    return [voice for voice in list_voices() if voice.get("language", "").lower() == HINDI_LANGUAGE.lower()]


def synthesize_hindi(text: str, voice_id: str, output_path: str) -> dict:
    """Generate a Hindi WAV using the selected Windows Runtime voice."""
    if not text.strip():
        raise WindowsSpeechError("Text cannot be empty.")
    if len(text) > 5000:
        raise WindowsSpeechError("Text exceeds the 5000 character limit.")
    if not any(voice["id"] == voice_id for voice in list_hindi_voices()):
        raise WindowsSpeechError("The selected Hindi voice is not installed or is not a hi-IN voice.")
    result = _run({"action": "synthesize", "text": text, "voice_id": voice_id, "output_path": output_path})
    encoded = result.pop("audio_base64", None)
    if not encoded:
        raise WindowsSpeechError("Windows Runtime helper returned no audio payload.")
    try:
        audio = base64.b64decode(encoded, validate=True)
    except (ValueError, TypeError) as exc:
        raise WindowsSpeechError("Windows Runtime helper returned invalid audio data.") from exc
    output = Path(output_path)
    if len(audio) < 100 or audio[:4] != b"RIFF":
        raise WindowsSpeechError("Windows Runtime helper returned an invalid WAV file.")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(audio)
    return result

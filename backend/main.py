"""Vanni AI backend: local TTS via Windows speech engines.
English uses SAPI5 and Hindi uses Windows Runtime speech voices. No API key, no cloud."""
import os, re, tempfile, threading
import pyttsx3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask
try:
    from .windows_speech import WindowsSpeechError, list_hindi_voices, list_voices as list_windows_voices, synthesize_hindi
except ImportError:
    from windows_speech import WindowsSpeechError, list_hindi_voices, list_voices as list_windows_voices, synthesize_hindi

app = FastAPI(title="Vanni AI")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])
_lock = threading.Lock()  # pyttsx3 engines are not thread-safe
FEMALE_HINTS = re.compile(r"zira|hazel|susan|eva|aria|jenny|heera|linda|catherine|female|samantha|victoria", re.I)
LANGUAGE_RULES = (
    ("hi-IN", "Hindi", "Indian Hindi", re.compile(r"(?:hi[-_ ]?in|hindi)", re.I)),
    ("mr-IN", "Marathi", "Indian Marathi", re.compile(r"(?:mr[-_ ]?in|marathi)", re.I)),
)
SUPPORTED_LANGUAGES = {"en-US": "English", "hi-IN": "Hindi", "mr-IN": "Marathi"}

def _voice_text(v) -> str:
    parts = [str(getattr(v, "id", "")), str(getattr(v, "name", ""))]
    for language in getattr(v, "languages", []) or []:
        parts.append(language.decode("ascii", errors="ignore") if isinstance(language, bytes) else str(language))
    return " ".join(parts)

def _language(v):
    text = _voice_text(v)
    for code, name, accent, pattern in LANGUAGE_RULES:
        if pattern.search(text):
            return code, name, accent
    return "en-US", "English", "System English"

def _gender(v) -> str:
    g = getattr(v, "gender", None)
    if isinstance(g, str) and g:
        return "female" if g.lower().startswith("f") else "male"
    return "female" if FEMALE_HINTS.search(v.name) else "male"

def _list_voices():
    eng = pyttsx3.init()
    try:
        result = []
        for v in eng.getProperty("voices"):
            language, language_name, accent = _language(v)
            result.append({"id": v.id, "name": re.sub(r"^Microsoft | Desktop$", "", v.name),
                           "gender": _gender(v), "language": language,
                           "language_name": language_name, "accent": accent})
        return result
    finally:
        eng.stop()

class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice_id: str
    language: str = "en-US"
    speed: float = Field(1.0, ge=0.5, le=1.6)

@app.get("/api/health")
def health(): return {"ok": True}

@app.get("/api/voices")
def voices():
    with _lock:
        try: vs = _list_voices()
        except Exception as e: raise HTTPException(500, f"Speech engine unavailable: {e}")
        runtime_error = None
        try:
            for voice in list_windows_voices():
                if str(voice.get("language", "")).lower() != "hi-in":
                    continue
                vs.append({"id": voice["id"], "name": voice.get("name") or "Hindi voice",
                           "gender": str(voice.get("gender", "")).lower() or "unknown",
                           "language": "hi-IN", "language_name": "Hindi",
                           "accent": "India", "engine": "windows-runtime",
                           "description": voice.get("description", "")})
        except WindowsSpeechError as e:
            runtime_error = str(e)
    response = {"voices": vs, "languages": [{"id": code, "name": name,
                                                "available": any(v["language"] == code for v in vs)}
                                               for code, name in SUPPORTED_LANGUAGES.items()]}
    if runtime_error:
        response["runtime_error"] = runtime_error
    return response

@app.post("/api/tts")
def tts(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text cannot be empty.")
    if req.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(400, "Unsupported language. Choose English, Hindi, or Marathi.")
    path = os.path.join(tempfile.gettempdir(), f"vanni_{os.urandom(6).hex()}.wav")
    if req.language == "hi-IN":
        with _lock:
            try:
                hindi_voices = list_hindi_voices()
                if not any(voice.get("id") == req.voice_id for voice in hindi_voices):
                    raise HTTPException(400, "The selected voice is not an installed Hindi (India) Windows Runtime voice.")
                synthesize_hindi(req.text, req.voice_id, path)
            except HTTPException:
                raise
            except WindowsSpeechError as e:
                raise HTTPException(500, f"Hindi speech generation failed: {e}") from e
        if not os.path.exists(path) or os.path.getsize(path) < 100:
            raise HTTPException(500, "Windows Runtime speech produced no audio.")
        return FileResponse(path, media_type="audio/wav", filename="vanni-hindi.wav",
                            background=BackgroundTask(lambda: os.remove(path)))
    with _lock:
        eng = None
        try:
            eng = pyttsx3.init()
            installed_voices = eng.getProperty("voices")
            selected = next((v for v in installed_voices if v.id == req.voice_id), None)
            if selected is None:
                raise HTTPException(400, "The selected voice is no longer installed.")
            selected_language = _language(selected)[0]
            if selected_language != req.language:
                raise HTTPException(400, f"Selected voice is {SUPPORTED_LANGUAGES[selected_language]}, not {SUPPORTED_LANGUAGES[req.language]}.")
            eng.setProperty("voice", req.voice_id)
            eng.setProperty("rate", int(190 * req.speed))
            eng.save_to_file(req.text, path)
            eng.runAndWait()
        except HTTPException: raise
        except Exception as e: raise HTTPException(500, f"Speech generation failed: {e}")
        finally:
            if eng is not None:
                eng.stop()
    if not os.path.exists(path) or os.path.getsize(path) < 100:
        raise HTTPException(500, "Speech engine produced no audio.")
    return FileResponse(path, media_type="audio/wav", filename="vanni.wav",
                        background=BackgroundTask(lambda: os.remove(path)))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("VANNI_PORT", 8000)))

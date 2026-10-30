# Vanni AI

Vanni is a local-first text-to-speech studio with an audio-reactive voice visualization. It combines a React/Vite frontend with a FastAPI backend and generates WAV audio on the local Windows machine.

## Features

- English speech through installed Windows SAPI5 voices via `pyttsx3`.
- Hindi (`hi-IN`) speech through the Windows Runtime `Windows.Media.SpeechSynthesis` API.
- Dynamic voice discovery with language, gender, accent, and engine metadata.
- Hindi voice selection for installed voices such as Microsoft Kalpana (female) and Microsoft Hemant (male).
- Devanagari text passed unchanged, including punctuation and long paragraphs.
- WAV playback, replay, stop, and download.
- Audio-reactive presenter visualization and live transcript.
- No cloud service, API key, paid dependency, transliteration, or translation.

## Technology

### Frontend

- React 18
- Vite
- Tailwind CSS
- GSAP
- Lucide React

### Backend

- Python 3.10+
- FastAPI, Uvicorn, and Pydantic
- pyttsx3 / Windows SAPI5 for English
- Windows Runtime `Windows.Media.SpeechSynthesis` for Hindi
- Reusable PowerShell bridge for Windows Runtime async operations

## Requirements

- Windows 10/11
- Python 3.10 or newer
- Node.js 18 or newer
- Installed Windows speech voices

For Hindi, install the Hindi language pack and speech voice from:

`Settings > Time & language > Language & region > Hindi > Language options > Speech`

Restart the backend after installing or changing Windows voices.

## Installation and running

From the repository root:

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The API runs at `http://127.0.0.1:8000`.

Alternatively, start it with Uvicorn from the project root:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in a browser.

For a production build:

```powershell
npm run build
```

## API

### Discover voices

```http
GET /api/voices
```

The response contains dynamically discovered voices and language availability. Hindi voices are reported with `engine: "windows-runtime"` and `language: "hi-IN"`.

### Generate speech

```http
POST /api/tts
Content-Type: application/json
```

Example request:

```json
{
  "text": "यह हिंदी में एक परीक्षण वाक्य है।",
  "voice_id": "<installed-hi-IN-voice-id>",
  "language": "hi-IN",
  "speed": 1.0
}
```

The endpoint returns a playable `audio/wav` response. It validates the language and voice together and never silently substitutes an incompatible English voice.

## Windows Runtime Hindi integration

Hindi synthesis is implemented in `backend/windows_speech.py` and `backend/windows_speech.ps1`.

The Python service:

1. Discovers installed Windows Runtime voices.
2. Verifies that the requested voice is installed and has locale `hi-IN`.
3. Sends UTF-8 JSON through a base64 envelope to avoid Windows PowerShell code-page conversion of Devanagari text.
4. Invokes `SpeechSynthesizer.SynthesizeTextToStreamAsync`.
5. Returns the generated WAV payload to Python and validates the RIFF/WAV header.
6. Exposes the audio through the existing FastAPI response and frontend download flow.

The helper applies input validation, a timeout, voice validation, and actionable error reporting. No paid service or external Hindi TTS package is required.

## Language availability

- English is the default language and continues to use the existing SAPI5 pipeline.
- Hindi is available when a compatible `hi-IN` Windows Runtime voice is installed.
- Marathi remains available in the language selector, but generation requires an installed compatible `mr-IN` Windows Runtime voice. If none is found, the UI explains that the required Windows voice is unavailable.

The application does not claim native regional accents unless Windows exposes a compatible voice and metadata for that language.

## Verification status

Verified locally on Windows with:

- Dynamic discovery of Microsoft Kalpana and Microsoft Hemant.
- English WAV generation through the existing path.
- Hindi WAV generation through the HTTP API using both Hindi voices.
- Devanagari Unicode preservation.
- Invalid voice rejection with a clear HTTP 400 response.
- Frontend Hindi voice selection, playback, and WAV download flow.
- Python syntax checks.
- Frontend production build via `npm run build`.

No dedicated backend test suite is currently included in the repository.
"# VaaniAI" 

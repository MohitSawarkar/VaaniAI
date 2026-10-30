# Vanni AI Voice Studio

Vanni AI is a local text-to-speech studio for Windows. Write a script, select an installed voice, choose a language and delivery speed, generate a WAV file, then play or download it from the browser.

Speech is rendered on the local machine. No cloud account, API key, or external speech provider is required.

## Features

- Local Windows speech synthesis through SAPI5 and Windows Runtime speech APIs.
- English, Hindi, and Marathi language options.
- Automatic discovery of installed voices and language availability.
- Voice and language compatibility validation before synthesis.
- Adjustable delivery speed from 0.5x to 1.6x.
- WAV playback, pause, stop, replay, and download controls.
- Audio-reactive waveform and presenter visualization.
- Audio-driven mouth animation based on the generated audio signal.
- Local-only backend binding on 127.0.0.1 by default.

## Architecture

The project contains two services:

    Browser
      |
      +-- Vite + React frontend :5173
      |       +-- /api proxy
      |
      +-- FastAPI backend :8000
              |
              +-- pyttsx3 / SAPI5 for English and other SAPI voices
              +-- Windows Runtime speech for Hindi voices

### Frontend

The frontend is a React 18 application served by Vite. Its source is in [frontend/src](./frontend/src). The development server listens on port 5173 and proxies /api requests to http://127.0.0.1:8000.

Important frontend areas:

- [frontend/src/components/Studio.jsx](./frontend/src/components/Studio.jsx): script editor, voice settings, generation, and playback controls.
- [frontend/src/services/api.js](./frontend/src/services/api.js): backend requests.
- [frontend/src/hooks/useAudioEngine.js](./frontend/src/hooks/useAudioEngine.js): audio playback and analyser state.
- [frontend/src/components/Avatar.jsx](./frontend/src/components/Avatar.jsx): presenter visualization.
- [frontend/src/components/Waveform.jsx](./frontend/src/components/Waveform.jsx): waveform display.

### Backend

The backend is a FastAPI application in [backend/main.py](./backend/main.py). It discovers installed voices, validates requests, generates temporary WAV files, returns them to the browser, and removes them after the response completes.

The Windows Runtime bridge is implemented by [backend/windows_speech.py](./backend/windows_speech.py) and [backend/windows_speech.ps1](./backend/windows_speech.ps1). Hindi synthesis requires a compatible installed Windows Hindi speech voice.

## Requirements

- Windows 10 or Windows 11.
- Python 3.10 or newer.
- Node.js and npm.
- At least one installed Windows speech voice.
- A Hindi Windows language pack and speech voice for Hindi synthesis.
- PowerShell for the Windows Runtime speech bridge.

Backend dependencies are pinned in [backend/requirements.txt](./backend/requirements.txt):

- fastapi==0.115.0
- uvicorn[standard]==0.30.6
- pyttsx3==2.98

Frontend dependencies and scripts are defined in [frontend/package.json](./frontend/package.json).

## Installation

Open PowerShell in the repository root.

### 1. Create the Python environment

    python -m venv .venv
    .venv\Scripts\Activate.ps1
    python -m pip install --upgrade pip
    python -m pip install -r backend\requirements.txt

If PowerShell blocks activation for the current user, run:

    Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

Then activate the environment again.

### 2. Install frontend dependencies

    Set-Location frontend
    npm install
    Set-Location ..

## Running the project

Run the backend and frontend in separate PowerShell windows.

### Backend

From the repository root:

    .venv\Scripts\python.exe backend\main.py

The backend starts at http://127.0.0.1:8000.

To use another backend port:

    $env:VANNI_PORT = "8010"
    .venv\Scripts\python.exe backend\main.py

The proxy in [frontend/vite.config.js](./frontend/vite.config.js) must be updated if the backend is moved away from port 8000.

### Frontend

    Set-Location frontend
    npm run dev -- --host 127.0.0.1

Open http://127.0.0.1:5173.

Available npm scripts:

    npm run dev       Start the Vite development server
    npm run build     Create a production build in frontend/dist
    npm run preview   Preview the production build locally

## API reference

### Health check

    GET /api/health

Response:

    {"ok": true}

### Discover voices

    GET /api/voices

The response contains a voices array and a languages array. Each voice includes an identifier, display name, gender estimate, language, and accent. Hindi Windows Runtime voices are marked with engine: "windows-runtime".

Example:

    Invoke-RestMethod http://127.0.0.1:8000/api/voices | ConvertTo-Json -Depth 8

If Windows Runtime discovery fails, the response can still include SAPI5 voices and a runtime_error field.

### Generate speech

    POST /api/tts
    Content-Type: application/json

Request body:

    {
      "text": "Hello from Vanni AI.",
      "voice_id": "<id returned by /api/voices>",
      "language": "en-US",
      "speed": 1.0
    }

Validation rules:

| Field | Required | Allowed values |
| --- | --- | --- |
| text | Yes | 1-5000 characters; whitespace-only text is rejected |
| voice_id | Yes | An installed voice ID returned by /api/voices |
| language | No | en-US, hi-IN, or mr-IN; defaults to en-US |
| speed | No | 0.5-1.6; defaults to 1.0 |

The endpoint returns an audio/wav response. Generated files are written to the system temporary directory and scheduled for deletion after the response is sent.

## Windows voice setup

English and other SAPI5-compatible voices are discovered through pyttsx3. Hindi uses the Windows Runtime bridge and requires a Hindi speech voice:

1. Open Windows Settings.
2. Go to Time & language -> Language & region.
3. Add or open Hindi.
4. Install the Hindi language pack and Speech feature.
5. Restart the backend.
6. Refresh the frontend and select Hindi.

Marathi is exposed by the API, but synthesis requires a compatible installed Marathi voice. If no voice is detected for a selected language, the frontend displays an installation prompt.

## Verification

Check Python syntax:

    .venv\Scripts\python.exe -m py_compile backend\main.py backend\windows_speech.py

Check the backend:

    Invoke-RestMethod http://127.0.0.1:8000/api/health
    Invoke-RestMethod http://127.0.0.1:8000/api/voices | ConvertTo-Json -Depth 8

Build the frontend:

    Set-Location frontend
    npm run build

There is currently no dedicated automated backend test suite. Full speech verification depends on the voices installed on the Windows host.

## Configuration

The frontend can use a separate backend URL through VITE_API_BASE:

    $env:VITE_API_BASE = "http://127.0.0.1:8000"
    npm run dev

When VITE_API_BASE is empty or unset, the frontend uses the Vite /api proxy.

The backend port is controlled by VANNI_PORT, not VOXORA_PORT:

    $env:VANNI_PORT = "8000"

## Troubleshooting

### Cannot reach the voice server

Start the backend first and confirm:

    Invoke-RestMethod http://127.0.0.1:8000/api/health

Also confirm that the frontend proxy and backend use the same port.

### No voices appear

Confirm that Windows has at least one speech voice installed. Restart the backend after adding or changing voices.

### Hindi is unavailable

Install the Hindi speech feature in Windows Language settings. Hindi synthesis only works on Windows with the Runtime speech bridge available.

### Speech generation fails

Confirm that the selected voice still exists, the language matches the voice, the text is not empty, and the text is no longer than 5000 characters. Check the backend process output for details.

### Port already in use

Find the process using the port:

    Get-NetTCPConnection -State Listen -LocalPort 8000,5173

Stop the old development process or change the backend port and update the Vite proxy configuration.

## Project structure

    .
    ├── backend/
    │   ├── main.py                 FastAPI application and TTS routes
    │   ├── requirements.txt        Python dependencies
    │   ├── windows_speech.py       Windows Runtime speech wrapper
    │   ├── windows_speech.ps1      PowerShell speech bridge
    │   └── README.md               Backend-specific notes
    ├── frontend/
    │   ├── src/
    │   │   ├── components/         React UI components
    │   │   ├── hooks/              Audio engine hooks
    │   │   ├── services/           API client
    │   │   └── styles/              Application styles
    │   ├── public/                 Static assets
    │   ├── package.json            npm scripts and dependencies
    │   └── vite.config.js          Dev server and API proxy
    ├── .env.example                Example environment variables
    └── README.md                   Project documentation

## Security and privacy notes

- The backend binds to 127.0.0.1 and is intended for local use.
- Speech text is processed by local Windows speech engines.
- Do not expose the backend publicly without authentication, strict CORS rules, rate limiting, and request-size controls.
- Voice identifiers are validated against currently installed voices before synthesis.
- Temporary WAV files are removed after the response is completed.

## License and asset attribution

The project does not currently declare a software license. Review and add an appropriate license before distributing it. Frontend asset attribution is documented in [frontend/public/avatar-attribution.txt](./frontend/public/avatar-attribution.txt).


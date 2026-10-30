import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download, Loader2, Pause, Play, RotateCcw, Square, Sparkles, Trash2 } from 'lucide-react'
import { fetchVoices, generateSpeech } from '../services/api'
import { useAudioEngine } from '../hooks/useAudioEngine'
import Avatar from './Avatar'
import Waveform from './Waveform'

const MAX = 5000
const LANGUAGES = [{ id: 'en-US', name: 'English' }, { id: 'hi-IN', name: 'Hindi' }, { id: 'mr-IN', name: 'Marathi' }]

export default function Studio() {
  const engine = useAudioEngine()
  const [text, setText] = useState('Hello. I am Vanni, your voice studio presenter. Give your words a little more presence.')
  const [voices, setVoices] = useState([])
  const [language, setLanguage] = useState('en-US')
  const [voiceId, setVoiceId] = useState('')
  const [speed, setSpeed] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [voiceDiscoveryError, setVoiceDiscoveryError] = useState('')
  const compatibleVoices = useMemo(() => voices.filter((voice) => voice.language === language), [voices, language])
  const selectedLanguage = LANGUAGES.find((item) => item.id === language)

  useEffect(() => {
    fetchVoices().then(({ voices: items, runtime_error }) => {
      setVoices(items)
      setVoiceDiscoveryError(runtime_error || '')
      setVoiceId(items.find((voice) => voice.language === 'en-US')?.id || '')
    }).catch((err) => setError(`Cannot reach the voice server. Start the backend first. ${err.message}`))
  }, [])

  useEffect(() => { setVoiceId(compatibleVoices[0]?.id || '') }, [language, compatibleVoices])

  const generate = async () => {
    setError('')
    if (!text.trim()) { setError('Enter some text before generating speech.'); return }
    if (!voiceId) { setError(`No compatible ${selectedLanguage?.name || 'selected'} voice is installed.`); return }
    setBusy(true)
    try { engine.stop(); const audioUrl = await generateSpeech({ text, voiceId, language, speed }); engine.load(audioUrl); await engine.play() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  const playing = engine.status === 'playing'
  return (
    <section id="studio" className="studio-shell">
      <div className="studio-copy" data-hero>
        <span className="eyebrow"><span className="eyebrow-line" /> AI voice studio</span>
        <h1>Bring your words <em>to life.</em></h1>
        <p className="lede">A considered space for expressive speech. Shape your script, choose a local voice, and let Vanni deliver it with presence.</p>
        <div className="trust-row"><span className="trust-mark">01</span><span>Local processing</span><span className="trust-separator" /><span>WAV export</span></div>
      </div>

      <div className="studio-layout">
        <div className="studio-controls">
          <div className="section-kicker"><span>01</span><span>Compose</span></div>
          <div className="editor-card glass">
            <div className="card-heading"><div><span className="card-label">Your script</span><h2>What would you like to say?</h2></div><span className="counter">{text.length.toString().padStart(4, '0')} / {MAX}</span></div>
            <textarea id="script" value={text} maxLength={MAX} onChange={(event) => setText(event.target.value)} rows={7} placeholder="Write something worth hearing..." />
            <div className="editor-footer"><span>{text.length < 80 ? 'A short thought is a good place to start.' : 'Your voice is ready when you are.'}</span><button className="clear-btn" type="button" onClick={() => setText('')} disabled={!text}><Trash2 size={13} /> Clear</button></div>
          </div>

          <div className="voice-settings glass">
            <div className="section-kicker"><span>02</span><span>Voice settings</span></div>
            <div className="setting-grid">
              <label className="field"><span>Language</span><select id="language" value={language} onChange={(event) => setLanguage(event.target.value)}>{LANGUAGES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="field"><span>Voice</span><select id="voice" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} disabled={!compatibleVoices.length}><option value="">{compatibleVoices.length ? 'Select a voice' : `No ${selectedLanguage?.name || 'compatible'} voice installed`}</option>{compatibleVoices.map((voice) => <option key={voice.id} value={voice.id}>{voice.name} · {voice.accent} · {voice.gender}</option>)}</select></label>
              <label className="field delivery-field"><span>Delivery <b>{speed.toFixed(1)}×</b></span><input type="range" min="0.5" max="1.6" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>
            </div>
            <button className="generate-btn" type="button" onClick={generate} disabled={busy || !text.trim() || !voiceId}>{busy ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}{busy ? 'Preparing your voice...' : 'Generate speech'}<span>↗</span></button>
            {!compatibleVoices.length && <p className="voice-help">{voiceDiscoveryError || `No compatible ${selectedLanguage?.name} voice was detected. Install the Windows ${selectedLanguage?.name} language pack and speech voice, then restart the backend.`}</p>}
            {error && <p className="error-note" role="alert"><AlertCircle size={16} />{error}</p>}
          </div>

          <div className="audio-card glass"><div className="section-kicker"><span>03</span><span>Playback</span><span className="audio-state">{playing ? 'Live' : engine.url ? 'Ready' : 'Waiting for audio'}</span></div><Waveform analyserRef={engine.analyserRef} active={playing} /><div className="audio-actions"><button className="control-btn primary" type="button" disabled={!engine.url} onClick={playing ? engine.pause : engine.play}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? 'Pause' : 'Play'}</button><button className="icon-btn" type="button" disabled={!engine.url} onClick={engine.stop} aria-label="Stop"><Square size={14} /></button><button className="icon-btn" type="button" disabled={!engine.url} onClick={engine.replay} aria-label="Replay"><RotateCcw size={15} /></button><a className={`control-btn download-btn ${engine.url ? '' : 'disabled'}`} href={engine.url || undefined} download="vanni.wav"><Download size={15} /> WAV</a></div></div>
        </div>

        <div className="presenter-column"><div className="section-kicker presenter-kicker"><span>04</span><span>Live presenter</span><span className="presenter-note">{engine.status === 'paused' ? 'Paused' : 'Audio reactive'}</span></div><Avatar mouth={engine.mouth} speaking={playing} text={text} currentTime={engine.currentTime} duration={engine.duration} status={engine.status} /></div>
      </div>
    </section>
  )
}

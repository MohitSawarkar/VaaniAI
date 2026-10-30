import { Mic2, Sparkles } from 'lucide-react'
import LiveTranscript from './LiveTranscript'

const signalBars = [18, 30, 46, 26, 62, 38, 74, 48, 88, 56, 70, 34, 52, 24, 42, 20]

export default function Avatar({ mouth, speaking, text, currentTime, duration, status }) {
  const energy = Math.max(0.35, Math.min(1, mouth.current?.open * 1.8 || 0.35))

  return (
    <div className={`presenter-card ${speaking ? 'is-speaking' : ''}`}>
      <div className="presenter-stage voice-stage">
        <LiveTranscript text={text || ''} currentTime={currentTime} duration={duration} status={status} />
        <div className="voice-visual" aria-label="Vanni voice visualization">
          <div className="signal-halo signal-halo-outer" />
          <div className="signal-halo signal-halo-inner" />
          <div className="voice-orb" style={{ '--voice-energy': energy }}>
            <div className="voice-orb-glow" />
            <Mic2 size={34} strokeWidth={1.35} />
            <span className="voice-orb-label">VX</span>
          </div>
          <div className="signal-bars" style={{ '--voice-energy': energy }}>
            {signalBars.map((height, index) => <i key={index} style={{ '--bar-height': `${height}%`, '--bar-delay': `${index * 0.045}s` }} />)}
          </div>
        </div>
        <div className="voice-intro"><span className="voice-intro-mark"><Sparkles size={13} /></span><span>Vanni voice intelligence</span></div>
        <div className="presenter-vignette" />
        <div className="presenter-meta"><span className="status-dot" /> {speaking ? 'Speaking now' : 'Ready to speak'}</div>
        <div className="presenter-caption"><span>Vanni studio</span><span className="caption-rule" /><span>Designed for expression</span></div>
      </div>
    </div>
  )
}

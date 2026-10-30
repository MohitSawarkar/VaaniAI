import { AudioWaveform, Download, Eye, Mic2 } from 'lucide-react'

export function Navbar() {
  return <header className="site-header"><nav className="nav-wrap"><a className="brand" href="#home"><span className="brand-orb" />Vanni <small>AI</small></a><div className="nav-links"><a href="#home">Home</a><a href="#studio">Voice studio</a><a href="#features">Features</a><a href="#about">About</a></div><a className="nav-cta" href="#studio">Start creating <span>↗</span></a></nav></header>
}

const features = [[Mic2, 'Local voices', 'Speech is generated on your own machine from the voices installed in Windows.'], [Eye, 'Voice presence', 'A focused visual identity gives every take a calm, polished sense of presence.'], [AudioWaveform, 'Audio reactive', 'The signal visualization and transcript follow the audio that is actually playing.'], [Download, 'Real WAV files', 'Export every take as a clean WAV file and use it wherever you need.']]

export function Features() { return <section id="features" className="content-section feature-section"><div className="section-intro"><span className="eyebrow"><span className="eyebrow-line" /> Made to sound like you</span><h2>Quietly powerful.<br /><em>Human at the center.</em></h2><p>Vanni keeps the technology out of the way so the message can lead.</p></div><div className="feature-grid">{features.map(([Icon, title, description], index) => <article className="feature-card glass" key={title}><span className="feature-index">0{index + 1}</span><Icon size={19} /><h3>{title}</h3><p>{description}</p></article>)}</div></section> }

export function How() { return <section className="content-section process-section"><div className="section-intro"><span className="eyebrow"><span className="eyebrow-line" /> The rhythm</span><h2>From thought<br /><em>to expression.</em></h2></div><div className="process-grid">{['Write a considered script and choose one of your installed voices.', 'Your private backend renders a WAV file in seconds.', 'The player reads the real waveform as the voice visualization responds.', 'Pause, replay, and export the final take when it feels right.'].map((copy, index) => <div className="process-step" key={copy}><span>0{index + 1}</span><p>{copy}</p></div>)}</div></section> }

export function About() { return <section id="about" className="about-section"><div className="about-mark">V</div><div><span className="eyebrow"><span className="eyebrow-line" /> About Vanni</span><h2>A more <em>human</em> way to speak.</h2><p>Vanni is a local-first text-to-speech studio for people who care about how a message lands. No paid API, no cloud dependency, and no clutter between your words and the listener.</p></div></section> }

export function Footer() { return <footer className="site-footer"><span>© {new Date().getFullYear()} Vanni AI</span><span>Made for meaningful voices</span></footer> }

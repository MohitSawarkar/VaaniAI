import { useEffect, useRef, useState, useCallback } from 'react'
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/* Audio-driven lip-sync: an AnalyserNode reads the audio that is actually playing.
   open = loudness (RMS); wide/round = spectral centroid (bright sounds like "ee" -> wide, dark like "oo" -> round).
   This is an amplitude/spectrum approximation, NOT phoneme-accurate viseme timing. */
export function useAudioEngine() {
  const audioRef = useRef(null), ctxRef = useRef(null), analyserRef = useRef(null)
  const mouth = useRef({ open: 0, wide: 0, round: 0 })
  const [status, setStatus] = useState('idle')
  const [url, setUrl] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const a = new Audio(); audioRef.current = a
    const onPlay = () => setStatus('playing')
    const onPause = () => setStatus(a.currentTime === 0 || a.ended ? 'idle' : 'paused')
    const onTimeUpdate = () => setCurrentTime(a.currentTime)
    const onMetadata = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0)
    const onEnded = () => { setCurrentTime(a.duration || a.currentTime); setStatus('idle') }
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('timeupdate', onTimeUpdate)
    a.addEventListener('loadedmetadata', onMetadata)
    a.addEventListener('durationchange', onMetadata)
    a.addEventListener('ended', onEnded)
    let raf, td, fd
    const tick = () => {
      const an = analyserRef.current, m = mouth.current
      let o = 0, w = 0, r = 0
      if (an && !a.paused && !a.ended) {
        td ||= new Uint8Array(an.fftSize); fd ||= new Uint8Array(an.frequencyBinCount)
        an.getByteTimeDomainData(td); an.getByteFrequencyData(fd)
        let s = 0; for (const v of td) { const x = (v - 128) / 128; s += x * x }
        o = clamp((Math.sqrt(s / td.length) - 0.015) * 7)
        let num = 0, den = 0; for (let i = 2; i < 180; i++) { num += i * fd[i]; den += fd[i] }
        const c = den > 0 ? num / den / 180 : 0.3
        w = o * clamp((c - 0.22) * 4); r = o * clamp((0.22 - c) * 5)
      }
      const k = o > m.open ? 0.55 : 0.22
      m.open += (o - m.open) * k; m.wide += (w - m.wide) * k; m.round += (r - m.round) * k
      if (m.open < 0.01) m.open = 0
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(raf); a.pause(); ctxRef.current?.close()
      a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause)
      a.removeEventListener('timeupdate', onTimeUpdate); a.removeEventListener('loadedmetadata', onMetadata)
      a.removeEventListener('durationchange', onMetadata); a.removeEventListener('ended', onEnded)
    }
  }, [])

  const ensureGraph = () => {
    if (ctxRef.current) return
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const src = ctx.createMediaElementSource(audioRef.current), an = ctx.createAnalyser()
    an.fftSize = 1024; an.smoothingTimeConstant = 0.6
    src.connect(an); an.connect(ctx.destination); ctxRef.current = ctx; analyserRef.current = an
  }
  const load = useCallback((u) => { audioRef.current.pause(); audioRef.current.src = u; audioRef.current.currentTime = 0; setUrl(u); setCurrentTime(0); setDuration(0); setStatus('idle') }, [])
  const play = useCallback(async () => { ensureGraph(); await ctxRef.current.resume(); await audioRef.current.play() }, [])
  const pause = useCallback(() => audioRef.current.pause(), [])
  const stop = useCallback(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; setCurrentTime(0); setStatus('idle') }, [])
  const replay = useCallback(async () => { audioRef.current.currentTime = 0; setCurrentTime(0); await play() }, [play])
  return { status, url, mouth, analyserRef, currentTime, duration, load, play, pause, stop, replay }
}

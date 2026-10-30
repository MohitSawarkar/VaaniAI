import { useEffect, useRef } from 'react'
export default function Waveform({ analyserRef, active }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, g = c.getContext('2d'); let raf, data
    const draw = () => {
      const w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = c.clientHeight * devicePixelRatio)
      g.clearRect(0, 0, w, h); const an = analyserRef.current, bars = 48, bw = w / bars
      if (an) { data ||= new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(data) }
      for (let i = 0; i < bars; i++) {
        const v = an && active ? data[Math.floor(i * 1.6) + 2] / 255 : 0
        const bh = Math.max(3 * devicePixelRatio, v * h * 0.95)
        g.fillStyle = active ? '#d9b66a' : '#3a3a44'
        g.beginPath(); g.roundRect(i * bw + bw * 0.2, (h - bh) / 2, bw * 0.6, bh, bw * 0.3); g.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw(); return () => cancelAnimationFrame(raf)
  }, [analyserRef, active])
  return <canvas ref={ref} className="w-full h-16" aria-label="Audio waveform" />
}

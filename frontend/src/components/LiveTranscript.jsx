import { useMemo } from 'react'

const VISIBLE_LINES = 4
const WORDS_PER_LINE = 9

function makeLines(text) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return [{ words: [] }]
  const lines = []
  for (let index = 0; index < words.length; index += WORDS_PER_LINE) lines.push({ words: words.slice(index, index + WORDS_PER_LINE), start: index })
  return lines
}

export default function LiveTranscript({ text, currentTime, duration, status }) {
  const lines = useMemo(() => makeLines(text), [text])
  const wordCount = lines.reduce((count, line) => count + line.words.length, 0)
  const hasClock = duration > 0 && wordCount > 0 && (currentTime > 0 || status === 'playing' || status === 'paused')
  const activeWord = hasClock ? Math.min(wordCount - 1, Math.floor((Math.min(currentTime, duration) / duration) * wordCount)) : -1
  const activeLine = activeWord >= 0 ? Math.floor(activeWord / WORDS_PER_LINE) : 0
  const maxOffset = Math.max(0, lines.length - VISIBLE_LINES)
  const offset = Math.min(maxOffset, Math.max(0, activeLine - 1))
  return (
    <div className="presenter-transcript" aria-live="polite" aria-label="Live speech transcript">
      <div className="transcript-viewport">
        <div className="transcript-track" style={{ transform: `translate3d(0, -${offset * 30}px, 0)` }}>
          {lines.map((line, lineIndex) => {
            const lineActive = lineIndex === activeLine && activeWord >= 0
            const linePast = lineIndex < activeLine
            return <div className={`transcript-line ${lineActive ? 'is-active' : ''} ${linePast ? 'is-past' : ''}`} key={`${lineIndex}-${line.words.join('-')}`}>
              {line.words.map((word, wordIndex) => {
                const wordIndexInText = line.start + wordIndex
                return <span className={wordIndexInText === activeWord ? 'is-current-word' : ''} key={`${wordIndexInText}-${word}`}>{word}{wordIndex < line.words.length - 1 ? ' ' : ''}</span>
              })}
            </div>
          })}
        </div>
      </div>
    </div>
  )
}

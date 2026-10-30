const BASE = import.meta.env.VITE_API_BASE || ''
async function err(res) { try { return (await res.json()).detail } catch { return `Request failed (${res.status})` } }
export async function fetchVoices() {
  const res = await fetch(`${BASE}/api/voices`)
  if (!res.ok) throw new Error(await err(res))
  const data = await res.json()
  return Array.isArray(data) ? { voices: data, languages: [] } : data
}
export async function generateSpeech({ text, voiceId, language, speed }) {
  const res = await fetch(`${BASE}/api/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_id: voiceId, language, speed }) })
  if (!res.ok) throw new Error(await err(res))
  return URL.createObjectURL(await res.blob())
}

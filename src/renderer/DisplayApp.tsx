import React, { useEffect, useRef, useState } from 'react'

// --- SRT parser ---
interface SubtitleCue {
  start: number // seconds
  end: number
  text: string
}

function parseSRT(srt: string): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  const blocks = srt.trim().split(/\n\s*\n/)
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    // Find the timestamp line (contains -->)
    const tsIdx = lines.findIndex(l => l.includes('-->'))
    if (tsIdx < 0) continue
    const [startStr, endStr] = lines[tsIdx].split('-->')
    const start = parseTimestamp(startStr.trim())
    const end = parseTimestamp(endStr.trim())
    const text = lines.slice(tsIdx + 1).join(' ').replace(/<[^>]+>/g, '').trim()
    if (!isNaN(start) && !isNaN(end) && text) {
      cues.push({ start, end, text })
    }
  }
  return cues
}

function parseTimestamp(ts: string): number {
  // 00:01:23,456 or 00:01:23.456
  const m = ts.match(/(\d+):(\d+):(\d+)[,.](\d+)/)
  if (!m) return NaN
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 1000
}

function findCue(cues: SubtitleCue[], time: number): string {
  for (const c of cues) {
    if (time >= c.start && time <= c.end) return c.text
  }
  return ''
}

// Invidious instances to try for captions
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
]

async function fetchCaptions(videoId: string): Promise<string | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      // Get available caption tracks
      const listRes = await fetch(`${instance}/api/v1/captions/${videoId}`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!listRes.ok) continue
      const data = await listRes.json()
      const captions = data.captions || []
      if (captions.length === 0) continue

      // Prefer: zh-TW > zh > zh-Hant > en > first available
      const pref = ['zh-TW', 'zh', 'zh-Hant', 'en']
      let track = null
      for (const lang of pref) {
        track = captions.find((c: any) => c.language_code === lang || c.label?.includes(lang))
        if (track) break
      }
      if (!track) track = captions[0]

      // Fetch SRT
      const srtUrl = track.url.startsWith('http') ? track.url : `${instance}${track.url}`
      const srtRes = await fetch(`${srtUrl}&fmt=srt`, { signal: AbortSignal.timeout(5000) })
      if (!srtRes.ok) continue
      return await srtRes.text()
    } catch {
      continue
    }
  }
  return null
}

const DisplayApp: React.FC = () => {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [subtitleText, setSubtitleText] = useState<string>('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const listeningRef = useRef(false)
  const cuesRef = useRef<SubtitleCue[]>([])
  const currentTimeRef = useRef(0)

  // Read videoId from URL query param (set by main process)
  useEffect(() => {
    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search)
      const v = params.get('v')
      if (v && v !== videoId) {
        setVideoId(v)
      }
    }

    checkUrl()

    // Also poll for URL changes (main process may navigate us)
    const interval = setInterval(checkUrl, 500)
    return () => clearInterval(interval)
  }, [videoId])

  // Listen for hash changes (alternative navigation method)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash && hash !== videoId) {
        setVideoId(hash)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [videoId])

  // YouTube IFrame API: detect video ended via postMessage
  useEffect(() => {
    if (!videoId) return

    const handleMessage = (event: MessageEvent) => {
      // YouTube sends JSON strings via postMessage
      if (typeof event.data !== 'string') return
      try {
        const data = JSON.parse(event.data)
        // YouTube IFrame API: info.playerState = 0 means ENDED
        if (data.event === 'onStateChange' && data.info === 0) {
          console.log('[Display] Video ended, notifying main process')
          window.electron?.ipcRenderer?.send('video-ended')
        }
      } catch {
        // Not JSON, ignore
      }
    }

    window.addEventListener('message', handleMessage)

    // Tell YouTube iframe to start sending events
    // Need small delay for iframe to load
    const timer = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 1 }),
          'https://www.youtube.com'
        )
        // Also subscribe to onStateChange
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
          'https://www.youtube.com'
        )
        listeningRef.current = true
      }
    }, 1500)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timer)
      listeningRef.current = false
    }
  }, [videoId])

  // Listen for player control commands from main process via IPC
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const sendYTCommand = (func: string, ...args: any[]) => {
      if (!iframeRef.current?.contentWindow || !listeningRef.current) return
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        'https://www.youtube.com'
      )
    }

    const handleControl = (command: string, ...args: any[]) => {
      console.log('[Display] Player control:', command, args)
      switch (command) {
        case 'pause-video':
          sendYTCommand('pauseVideo')
          break
        case 'stop-video':
          sendYTCommand('stopVideo')
          break
        case 'set-volume':
          sendYTCommand('setVolume', args[0] ?? 100)
          break
        case 'mute':
          sendYTCommand('mute')
          break
        case 'unmute':
          sendYTCommand('unMute')
          break
        case 'seek-to':
          sendYTCommand('seekTo', args[0] ?? 0, true)
          break
      }
    }

    window.electron.ipcRenderer.on('youtube-player-control', handleControl)
    return () => {
      window.electron?.ipcRenderer?.removeAllListeners('youtube-player-control')
    }
  }, [])

  // Load subtitles when videoId changes
  useEffect(() => {
    if (!videoId) return
    let cancelled = false
    cuesRef.current = []
    setSubtitleText('')

    async function loadSubtitles() {
      // Try cache first
      let srt: string | null = null
      try {
        srt = await window.electron?.subtitleCache?.read(videoId)
      } catch { /* no cache */ }

      if (!srt) {
        // Fetch from Invidious
        srt = await fetchCaptions(videoId)
        if (srt && !cancelled) {
          // Cache for next time
          try { await window.electron?.subtitleCache?.write(videoId, srt) } catch {}
        }
      }

      if (srt && !cancelled) {
        const parsed = parseSRT(srt)
        console.log(`[Display] Loaded ${parsed.length} subtitle cues for ${videoId}`)
        cuesRef.current = parsed
      }
    }

    loadSubtitles()
    return () => { cancelled = true }
  }, [videoId])

  // Poll YouTube current time and sync subtitles
  useEffect(() => {
    if (!videoId) return

    const handleTimeMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'infoDelivery' && typeof data.info?.currentTime === 'number') {
          currentTimeRef.current = data.info.currentTime
          if (cuesRef.current.length > 0) {
            const text = findCue(cuesRef.current, data.info.currentTime)
            setSubtitleText(text)
          }
        }
      } catch { /* ignore */ }
    }

    window.addEventListener('message', handleTimeMessage)

    // Poll getCurrentTime from YouTube iframe every 300ms
    const pollTimer = setInterval(() => {
      if (iframeRef.current?.contentWindow && listeningRef.current) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
          'https://www.youtube.com'
        )
      }
    }, 300)

    return () => {
      window.removeEventListener('message', handleTimeMessage)
      clearInterval(pollTimer)
    }
  }, [videoId])

  if (!videoId) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', color: 'white',
      }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '1rem' }}>AIPC KTV</h1>
        <p style={{ fontSize: '1.5rem', color: '#999' }}>Waiting for songs...</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* YouTube video — takes most of the screen */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      </div>

      {/* Subtitle bar at bottom */}
      <div style={{
        height: '80px',
        background: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid #333',
        padding: '0 2rem',
      }}>
        <p style={{
          fontSize: '1.8rem',
          fontWeight: 'bold',
          color: subtitleText ? '#fff' : '#555',
          textAlign: 'center',
        }}>
          {subtitleText || '♪ ♪ ♪'}
        </p>
      </div>
    </div>
  )
}

export default DisplayApp

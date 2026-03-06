import React, { useEffect, useRef, useState } from 'react'

const DisplayApp: React.FC = () => {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [subtitleText, setSubtitleText] = useState<string>('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const listeningRef = useRef(false)

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

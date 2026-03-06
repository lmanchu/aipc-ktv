import React, { useEffect, useRef, useState } from 'react'

const DisplayApp: React.FC = () => {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [subtitleText, setSubtitleText] = useState<string>('')

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
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&modestbranding=1`}
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

import React, { useEffect, useRef, useState } from 'react'
import { PlaybackState } from '../shared/types'

interface DisplayAppProps {
  videoId?: string
  autoplay?: boolean
}

const DisplayApp: React.FC<DisplayAppProps> = ({ videoId, autoplay = false }) => {
  const playerRef = useRef<HTMLDivElement>(null)
  const youtubePlayerRef = useRef<any>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [playerState, setPlayerState] = useState<PlaybackState>(PlaybackState.IDLE)
  const [error, setError] = useState<string | null>(null)

  // Initialize YouTube IFrame Player API
  useEffect(() => {
    // Load YouTube IFrame Player API script
    const loadYouTubeAPI = () => {
      return new Promise<void>((resolve) => {
        // Check if API is already loaded
        if (window.YT && window.YT.Player) {
          resolve()
          return
        }

        // Create script tag
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        document.head.appendChild(script)

        // YouTube API calls this function when ready
        window.onYouTubeIframeAPIReady = () => {
          resolve()
        }
      })
    }

    loadYouTubeAPI().then(() => {
      initializePlayer()
    })

    // Cleanup
    return () => {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy()
      }
    }
  }, [])

  // Initialize the YouTube player
  const initializePlayer = () => {
    if (!playerRef.current || !window.YT) return

    try {
      const player = new window.YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId || '',
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0, // Hide controls for karaoke mode
          disablekb: 1, // Disable keyboard controls
          fs: 0, // Disable fullscreen button
          modestbranding: 1, // Minimal YouTube branding
          rel: 0, // Don't show related videos
          iv_load_policy: 3, // Hide annotations
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      })

      youtubePlayerRef.current = player
    } catch (err) {
      setError('Failed to initialize YouTube player')
      console.error('YouTube player initialization error:', err)
    }
  }

  // Player ready callback
  const onPlayerReady = (event: any) => {
    setIsPlayerReady(true)
    setPlayerState(PlaybackState.IDLE)
    console.log('YouTube player ready')
  }

  // Player state change callback
  const onPlayerStateChange = (event: any) => {
    const state = event.data
    
    switch (state) {
      case -1: // UNSTARTED
        setPlayerState(PlaybackState.IDLE)
        break
      case 1: // PLAYING
        setPlayerState(PlaybackState.PLAYING)
        break
      case 2: // PAUSED
        setPlayerState(PlaybackState.PAUSED)
        break
      case 3: // BUFFERING
        setPlayerState(PlaybackState.LOADING)
        break
      case 0: // ENDED
        setPlayerState(PlaybackState.IDLE)
        // Notify main process that video ended
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.sendMessage('video-ended')
        }
        break
      case 5: // CUED
        setPlayerState(PlaybackState.IDLE)
        break
      default:
        setPlayerState(PlaybackState.IDLE)
    }
  }

  // Player error callback
  const onPlayerError = (event: { data: number }) => {
    const errorCode = event.data
    let errorMessage = 'Unknown error occurred'
    
    switch (errorCode) {
      case 2:
        errorMessage = 'Invalid video ID'
        break
      case 5:
        errorMessage = 'HTML5 player error'
        break
      case 100:
        errorMessage = 'Video not found or private'
        break
      case 101:
      case 150:
        errorMessage = 'Video cannot be embedded'
        break
      default:
        errorMessage = `YouTube player error: ${errorCode}`
    }
    
    setError(errorMessage)
    setPlayerState(PlaybackState.ERROR)
    console.error('YouTube player error:', errorMessage)
  }

  // Set up IPC message handlers
  useEffect(() => {
    if (!window.electron?.ipcRenderer || !isPlayerReady) return

    const handleIpcMessage = (message: string, ...args: any[]) => {
      const player = youtubePlayerRef.current
      if (!player) return

      try {
        switch (message) {
          case 'play-video':
            const [videoIdToPlay] = args
            if (videoIdToPlay) {
              player.loadVideoById(videoIdToPlay)
              setError(null) // Clear any previous errors
            } else {
              player.playVideo()
            }
            break
          
          case 'pause-video':
            player.pauseVideo()
            break
          
          case 'stop-video':
            player.stopVideo()
            break
          
          case 'seek-to':
            const [seconds] = args
            if (typeof seconds === 'number') {
              player.seekTo(seconds, true)
            }
            break
          
          case 'set-volume':
            const [volume] = args
            if (typeof volume === 'number' && volume >= 0 && volume <= 100) {
              player.setVolume(volume)
            }
            break
          
          case 'mute':
            player.mute()
            break
          
          case 'unmute':
            player.unMute()
            break
          
          case 'get-player-state':
            // Send current state back to main process
            window.electron!.ipcRenderer.sendMessage('player-state-response', {
              state: playerState,
              currentTime: player.getCurrentTime(),
              duration: player.getDuration(),
              volume: player.getVolume(),
              isMuted: player.isMuted(),
            })
            break
        }
      } catch (err) {
        console.error('Error handling IPC message:', message, err)
        setError(`Error executing ${message}`)
      }
    }

    // Register IPC listener
    window.electron.ipcRenderer.on('youtube-player-control', handleIpcMessage)

    // Cleanup
    return () => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeAllListeners('youtube-player-control')
      }
    }
  }, [isPlayerReady, playerState])

  // Render loading state
  if (!isPlayerReady && !error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-4xl font-bold mb-2">AIPC KTV</h1>
          <p className="text-xl text-gray-300">Loading YouTube Player...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">⚠️</h1>
          <h2 className="text-4xl font-bold mb-4">AIPC KTV</h2>
          <p className="text-2xl text-red-400 mb-4">Error</p>
          <p className="text-lg text-gray-300 max-w-md">{error}</p>
          <button
            onClick={() => {
              setError(null)
              initializePlayer()
            }}
            className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Main player interface
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Player container - takes most of the screen */}
      <div className="flex-1 relative">
        {videoId ? (
          <div
            ref={playerRef}
            className="w-full h-full"
            style={{ minHeight: 'calc(100vh - 120px)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold mb-4">AIPC KTV</h1>
              <p className="text-2xl text-gray-300">Ready for Karaoke!</p>
              <div className="mt-8 text-lg text-gray-400">
                Select a song to start singing!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="h-20 bg-gray-900 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                playerState === PlaybackState.PLAYING ? 'bg-green-500' :
                playerState === PlaybackState.PAUSED ? 'bg-yellow-500' :
                playerState === PlaybackState.LOADING ? 'bg-blue-500 animate-pulse' :
                playerState === PlaybackState.ERROR ? 'bg-red-500' :
                'bg-gray-500'
              }`}
            />
            <span className="text-sm text-gray-300 capitalize">{playerState}</span>
          </div>
        </div>
        
        <div className="text-sm text-gray-400">
          AIPC KTV Display
        </div>
      </div>
    </div>
  )
}

export default DisplayApp
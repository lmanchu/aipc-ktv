import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useQueueStore } from './store'
import { PlaybackState } from '../shared/types'

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  loadVideoById: (videoId: string) => void
  getPlayerState: () => number
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}

interface PlayerError {
  message: string
  videoId?: string
}

const DisplayApp: React.FC = () => {
  const playerRef = useRef<YTPlayer | null>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [error, setError] = useState<PlayerError | null>(null)

  const { 
    currentSong, 
    playbackState, 
    setPlaybackState,
    nextSong 
  } = useQueueStore()

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initializePlayer()
      return
    }

    // Load the IFrame Player API code asynchronously
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    // The API will call this function when it's ready
    window.onYouTubeIframeAPIReady = initializePlayer
  }, [])

  const initializePlayer = useCallback(() => {
    if (!playerContainerRef.current || playerRef.current || !window.YT) return

    try {
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0, // Hide controls for karaoke mode
          disablekb: 1, // Disable keyboard controls
          fs: 0, // Disable fullscreen button
          modestbranding: 1, // Remove YouTube logo
          rel: 0, // Don't show related videos
          showinfo: 0, // Hide video title
          iv_load_policy: 3, // Hide video annotations
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        },
      })
    } catch (err) {
      console.error('Failed to initialize YouTube player:', err)
      setError({ message: 'Failed to initialize YouTube player' })
    }
  }, [])

  const onPlayerReady = useCallback(() => {
    console.log('YouTube player ready')
    setIsPlayerReady(true)
    setError(null)
  }, [])

  const onPlayerStateChange = useCallback((event: { data: number }) => {
    const { YT } = window
    if (!YT) return

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        setPlaybackState(PlaybackState.PLAYING)
        setError(null)
        break
      case YT.PlayerState.PAUSED:
        setPlaybackState(PlaybackState.PAUSED)
        break
      case YT.PlayerState.BUFFERING:
        setPlaybackState(PlaybackState.LOADING)
        break
      case YT.PlayerState.ENDED:
        setPlaybackState(PlaybackState.IDLE)
        // Auto-advance to next song
        nextSong()
        break
      case YT.PlayerState.UNSTARTED:
        setPlaybackState(PlaybackState.IDLE)
        break
    }
  }, [setPlaybackState, nextSong])

  const onPlayerError = useCallback((event: { data: number }) => {
    console.error('YouTube player error:', event.data)
    let errorMessage = 'Video playback error'
    
    switch (event.data) {
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
        errorMessage = 'Video not allowed in embedded players'
        break
    }
    
    setError({ 
      message: errorMessage, 
      videoId: currentSong?.videoId 
    })
    setPlaybackState(PlaybackState.ERROR)
  }, [currentSong?.videoId, setPlaybackState])

  // Handle song changes
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || !currentSong) return

    try {
      console.log('Loading video:', currentSong.videoId)
      setPlaybackState(PlaybackState.LOADING)
      playerRef.current.loadVideoById(currentSong.videoId)
    } catch (err) {
      console.error('Failed to load video:', err)
      setError({ 
        message: 'Failed to load video',
        videoId: currentSong.videoId 
      })
      setPlaybackState(PlaybackState.ERROR)
    }
  }, [currentSong, isPlayerReady, setPlaybackState])

  // IPC handlers for player control
  useEffect(() => {
    const { ipcRenderer } = window

    const handlePlay = () => {
      if (playerRef.current && isPlayerReady) {
        playerRef.current.playVideo()
      }
    }

    const handlePause = () => {
      if (playerRef.current && isPlayerReady) {
        playerRef.current.pauseVideo()
      }
    }

    const handleStop = () => {
      if (playerRef.current && isPlayerReady) {
        playerRef.current.stopVideo()
      }
    }

    const handleLoadVideo = (_: any, videoId: string) => {
      if (playerRef.current && isPlayerReady) {
        setPlaybackState(PlaybackState.LOADING)
        playerRef.current.loadVideoById(videoId)
      }
    }

    const handleGetPlayerState = (_: any, requestId: string) => {
      let playerState = null
      if (playerRef.current && isPlayerReady) {
        playerState = {
          state: playerRef.current.getPlayerState(),
          currentTime: playerRef.current.getCurrentTime(),
          duration: playerRef.current.getDuration(),
        }
      }
      ipcRenderer.send('player-get-state-response', requestId, playerState)
    }

    // Register IPC listeners
    ipcRenderer.on('player-play', handlePlay)
    ipcRenderer.on('player-pause', handlePause)
    ipcRenderer.on('player-stop', handleStop)
    ipcRenderer.on('player-load-video', handleLoadVideo)
    ipcRenderer.on('player-get-state-request', handleGetPlayerState)

    return () => {
      ipcRenderer.off('player-play', handlePlay)
      ipcRenderer.off('player-pause', handlePause)
      ipcRenderer.off('player-stop', handleStop)
      ipcRenderer.off('player-load-video', handleLoadVideo)
      ipcRenderer.off('player-get-state-request', handleGetPlayerState)
    }
  }, [isPlayerReady, setPlaybackState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Main Player Area */}
      <div className="flex-1 flex items-center justify-center relative">
        {currentSong && isPlayerReady ? (
          <div className="w-full h-full">
            <div 
              ref={playerContainerRef}
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-4">AIPC KTV</h1>
            {!isPlayerReady && (
              <p className="text-2xl text-gray-300">Initializing player...</p>
            )}
            {isPlayerReady && !currentSong && (
              <>
                <p className="text-2xl text-gray-300">Display Window Ready</p>
                <div className="mt-8 text-lg text-gray-400">
                  Connect to start your karaoke experience!
                </div>
              </>
            )}
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2 text-red-400">Playback Error</h2>
              <p className="text-lg text-gray-300 mb-4">{error.message}</p>
              {error.videoId && (
                <p className="text-sm text-gray-500">Video ID: {error.videoId}</p>
              )}
              <div className="mt-6 text-gray-400">
                {playbackState === PlaybackState.ERROR && (
                  <p>Will automatically skip to next song...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {playbackState === PlaybackState.LOADING && !error && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
              <p className="text-xl">Loading video...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      {currentSong && (
        <div className="bg-gray-900 bg-opacity-90 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={currentSong.thumbnail} 
                alt={currentSong.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-bold text-lg">{currentSong.title}</h3>
                <p className="text-gray-300 text-sm">{currentSong.channel}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                playbackState === PlaybackState.PLAYING ? 'bg-green-600' :
                playbackState === PlaybackState.PAUSED ? 'bg-yellow-600' :
                playbackState === PlaybackState.LOADING ? 'bg-blue-600' :
                playbackState === PlaybackState.ERROR ? 'bg-red-600' :
                'bg-gray-600'
              }`}>
                {playbackState.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DisplayApp
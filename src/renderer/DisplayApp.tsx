import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useQueueStore } from './store'
import { PlaybackState } from '../shared/types'

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  loadVideoById: (videoId: string) => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  setVolume: (volume: number) => void
  getVolume: () => number
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
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
    const { YT, ipcRenderer } = window
    if (!YT) return

    let newState: PlaybackState = PlaybackState.IDLE

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        newState = PlaybackState.PLAYING
        setPlaybackState(PlaybackState.PLAYING)
        setError(null)
        break
      case YT.PlayerState.PAUSED:
        newState = PlaybackState.PAUSED
        setPlaybackState(PlaybackState.PAUSED)
        break
      case YT.PlayerState.BUFFERING:
        newState = PlaybackState.LOADING
        setPlaybackState(PlaybackState.LOADING)
        break
      case YT.PlayerState.ENDED:
        newState = PlaybackState.IDLE
        setPlaybackState(PlaybackState.IDLE)
        // Notify main window that video ended
        ipcRenderer.send('video-ended')
        // Auto-advance to next song
        nextSong()
        break
      case YT.PlayerState.UNSTARTED:
        newState = PlaybackState.IDLE
        setPlaybackState(PlaybackState.IDLE)
        break
    }

    // Send real-time state update to control window
    if (playerRef.current && isPlayerReady) {
      try {
        const stateUpdate = {
          state: newState,
          currentTime: playerRef.current.getCurrentTime() || 0,
          duration: playerRef.current.getDuration() || 0,
          volume: playerRef.current.getVolume() || 50,
          isMuted: playerRef.current.isMuted() || false,
          videoId: currentSong?.videoId || null,
        }
        ipcRenderer.send('player-state-changed', stateUpdate)
      } catch (error) {
        console.error('Error sending real-time state update:', error)
      }
    }
  }, [setPlaybackState, nextSong, currentSong?.videoId, isPlayerReady])

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

  // IPC handlers for comprehensive player control
  useEffect(() => {
    const { ipcRenderer } = window

    const handlePlayerControl = (_: any, command: string, ...args: any[]) => {
      if (!playerRef.current || !isPlayerReady) {
        console.warn(`Player not ready for command: ${command}`)
        return
      }

      try {
        switch (command) {
          case 'play-video':
            if (args[0]) {
              // Play specific video
              setPlaybackState(PlaybackState.LOADING)
              playerRef.current.loadVideoById(args[0])
              setTimeout(() => {
                if (playerRef.current && isPlayerReady) {
                  playerRef.current.playVideo()
                }
              }, 100)
            } else {
              // Resume current video
              playerRef.current.playVideo()
            }
            break

          case 'pause-video':
            playerRef.current.pauseVideo()
            break

          case 'stop-video':
            playerRef.current.stopVideo()
            break

          case 'seek-to':
            const seekTime = args[0]
            if (typeof seekTime === 'number' && seekTime >= 0) {
              playerRef.current.seekTo(seekTime, true)
              // Send state update after seek
              setTimeout(() => sendPlayerStateUpdate(), 100)
            } else {
              console.error('Invalid seek time:', seekTime)
            }
            break

          case 'set-volume':
            const volume = args[0]
            if (typeof volume === 'number' && volume >= 0 && volume <= 100) {
              playerRef.current.setVolume(volume)
              // Send state update after volume change
              setTimeout(() => sendPlayerStateUpdate(), 100)
            } else {
              console.error('Invalid volume:', volume)
            }
            break

          case 'mute':
            playerRef.current.mute()
            setTimeout(() => sendPlayerStateUpdate(), 100)
            break

          case 'unmute':
            playerRef.current.unMute()
            setTimeout(() => sendPlayerStateUpdate(), 100)
            break

          case 'get-player-state':
            const requestId = args[0] || 'unknown'
            sendPlayerStateResponse(requestId)
            break

          default:
            console.warn('Unknown player command:', command)
        }
      } catch (error) {
        console.error(`Error executing command ${command}:`, error)
        ipcRenderer.send('player-error', {
          command,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // Helper function to send comprehensive player state
    const sendPlayerStateResponse = (requestId: string) => {
      if (!playerRef.current || !isPlayerReady) {
        ipcRenderer.send('player-state-response', requestId, null)
        return
      }

      try {
        const state = {
          state: convertYTStateToPlaybackState(playerRef.current.getPlayerState()),
          currentTime: playerRef.current.getCurrentTime() || 0,
          duration: playerRef.current.getDuration() || 0,
          volume: playerRef.current.getVolume() || 50,
          isMuted: playerRef.current.isMuted() || false,
          videoId: currentSong?.videoId || null,
        }
        ipcRenderer.send('player-state-response', requestId, state)
      } catch (error) {
        console.error('Error getting player state:', error)
        ipcRenderer.send('player-state-response', requestId, null)
      }
    }

    // Helper function to send real-time state updates
    const sendPlayerStateUpdate = () => {
      if (!playerRef.current || !isPlayerReady) return

      try {
        const state = {
          state: convertYTStateToPlaybackState(playerRef.current.getPlayerState()),
          currentTime: playerRef.current.getCurrentTime() || 0,
          duration: playerRef.current.getDuration() || 0,
          volume: playerRef.current.getVolume() || 50,
          isMuted: playerRef.current.isMuted() || false,
          videoId: currentSong?.videoId || null,
        }
        ipcRenderer.send('player-state-changed', state)
      } catch (error) {
        console.error('Error sending state update:', error)
      }
    }

    // Helper function to convert YouTube player state to PlaybackState
    const convertYTStateToPlaybackState = (ytState: number): PlaybackState => {
      const { YT } = window
      if (!YT) return PlaybackState.IDLE

      switch (ytState) {
        case YT.PlayerState.PLAYING:
          return PlaybackState.PLAYING
        case YT.PlayerState.PAUSED:
          return PlaybackState.PAUSED
        case YT.PlayerState.BUFFERING:
          return PlaybackState.LOADING
        case YT.PlayerState.ENDED:
          return PlaybackState.IDLE
        case YT.PlayerState.UNSTARTED:
        default:
          return PlaybackState.IDLE
      }
    }

    // Register comprehensive IPC listener
    ipcRenderer.on('youtube-player-control', handlePlayerControl)

    return () => {
      ipcRenderer.off('youtube-player-control', handlePlayerControl)
    }
  }, [isPlayerReady, setPlaybackState, currentSong?.videoId])

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
import { useCallback, useEffect, useState } from 'react'
import { PlaybackState, PlayerStateInfo, YouTubePlayerCommand } from '../../shared/types'

interface UseYouTubePlayerReturn {
  // Display window management
  isDisplayWindowOpen: boolean
  openDisplayWindow: () => Promise<boolean>
  closeDisplayWindow: () => Promise<boolean>

  // Player controls
  playVideo: (videoId?: string) => Promise<boolean>
  pauseVideo: () => Promise<boolean>
  stopVideo: () => Promise<boolean>
  seekTo: (seconds: number) => Promise<boolean>
  setVolume: (volume: number) => Promise<boolean>
  mute: () => Promise<boolean>
  unmute: () => Promise<boolean>
  getPlayerState: () => Promise<PlayerStateInfo | null>

  // Player state
  playerState: PlayerStateInfo | null
  lastError: string | null
}

export const useYouTubePlayer = (): UseYouTubePlayerReturn => {
  const [isDisplayWindowOpen, setIsDisplayWindowOpen] = useState(false)
  const [playerState, setPlayerState] = useState<PlayerStateInfo | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  // Check if Electron APIs are available
  const isElectron = typeof window !== 'undefined' && window.electron && window.electron.youtubePlayer

  // Display window management
  const openDisplayWindow = useCallback(async (): Promise<boolean> => {
    if (!isElectron) {
      console.warn('YouTube player controls not available outside Electron')
      return false
    }

    try {
      const result = await window.electron!.youtubePlayer.openDisplayWindow()
      if (result.success) {
        setIsDisplayWindowOpen(true)
        setLastError(null)
        return true
      } else {
        setLastError(result.error || 'Failed to open display window')
        return false
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setLastError(errorMessage)
      console.error('Failed to open display window:', error)
      return false
    }
  }, [isElectron])

  const closeDisplayWindow = useCallback(async (): Promise<boolean> => {
    if (!isElectron) {
      console.warn('YouTube player controls not available outside Electron')
      return false
    }

    try {
      const result = await window.electron!.youtubePlayer.closeDisplayWindow()
      if (result.success) {
        setIsDisplayWindowOpen(false)
        setPlayerState(null)
        setLastError(null)
        return true
      } else {
        setLastError(result.error || 'Failed to close display window')
        return false
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setLastError(errorMessage)
      console.error('Failed to close display window:', error)
      return false
    }
  }, [isElectron])

  // Player control functions
  const sendPlayerCommand = useCallback(async (command: YouTubePlayerCommand, ...args: any[]): Promise<boolean> => {
    if (!isElectron) {
      console.warn('YouTube player controls not available outside Electron')
      return false
    }

    try {
      const result = await window.electron!.youtubePlayer.control(command, ...args)
      if (result.success) {
        setLastError(null)
        return true
      } else {
        setLastError(result.error || `Failed to execute ${command}`)
        return false
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setLastError(errorMessage)
      console.error(`Failed to execute ${command}:`, error)
      return false
    }
  }, [isElectron])

  const playVideo = useCallback(async (videoId?: string): Promise<boolean> => {
    if (videoId) {
      return sendPlayerCommand('play-video', videoId)
    } else {
      return sendPlayerCommand('play-video')
    }
  }, [sendPlayerCommand])

  const pauseVideo = useCallback(async (): Promise<boolean> => {
    return sendPlayerCommand('pause-video')
  }, [sendPlayerCommand])

  const stopVideo = useCallback(async (): Promise<boolean> => {
    return sendPlayerCommand('stop-video')
  }, [sendPlayerCommand])

  const seekTo = useCallback(async (seconds: number): Promise<boolean> => {
    if (seconds < 0) {
      setLastError('Seek time must be non-negative')
      return false
    }
    return sendPlayerCommand('seek-to', seconds)
  }, [sendPlayerCommand])

  const setVolume = useCallback(async (volume: number): Promise<boolean> => {
    if (volume < 0 || volume > 100) {
      setLastError('Volume must be between 0 and 100')
      return false
    }
    return sendPlayerCommand('set-volume', volume)
  }, [sendPlayerCommand])

  const mute = useCallback(async (): Promise<boolean> => {
    return sendPlayerCommand('mute')
  }, [sendPlayerCommand])

  const unmute = useCallback(async (): Promise<boolean> => {
    return sendPlayerCommand('unmute')
  }, [sendPlayerCommand])

  const getPlayerState = useCallback(async (): Promise<PlayerStateInfo | null> => {
    if (!isElectron) {
      console.warn('YouTube player controls not available outside Electron')
      return null
    }

    const requestId = `state-request-${Date.now()}-${Math.random()}`
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(playerState) // Return cached state if no response
      }, 1000) // 1 second timeout

      // Set up one-time listener for the response
      const handleResponse = (receivedRequestId: string, data: PlayerStateInfo | null) => {
        if (receivedRequestId === requestId) {
          clearTimeout(timeout)
          window.electron!.ipcRenderer.removeAllListeners('player-state-response')
          resolve(data)
        }
      }

      window.electron!.ipcRenderer.on('player-state-response', handleResponse)
      
      // Send the request
      sendPlayerCommand('get-player-state', requestId).catch(() => {
        clearTimeout(timeout)
        resolve(null)
      })
    })
  }, [isElectron, sendPlayerCommand, playerState])

  // Set up IPC message listeners for real-time state syncing
  useEffect(() => {
    if (!isElectron) return

    const handleVideoEnded = () => {
      setPlayerState(prev => prev ? { ...prev, state: PlaybackState.IDLE } : null)
      setLastError(null)
    }

    const handlePlayerStateResponse = (requestId: string, data: PlayerStateInfo | null) => {
      if (data) {
        setPlayerState(data)
        setLastError(null)
      }
    }

    const handlePlayerStateChanged = (stateUpdate: PlayerStateInfo) => {
      // Real-time state synchronization
      setPlayerState(stateUpdate)
      setLastError(null)
    }

    const handlePlayerError = (error: any) => {
      const errorMessage = error?.error || error?.message || 'Player error occurred'
      setLastError(errorMessage)
      console.error('Player error received via IPC:', error)
    }

    // Register listeners
    window.electron!.ipcRenderer.on('video-ended', handleVideoEnded)
    window.electron!.ipcRenderer.on('player-state-response', handlePlayerStateResponse)
    window.electron!.ipcRenderer.on('player-state-changed', handlePlayerStateChanged)
    window.electron!.ipcRenderer.on('player-error', handlePlayerError)

    // Cleanup
    return () => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeAllListeners('video-ended')
        window.electron.ipcRenderer.removeAllListeners('player-state-response')
        window.electron.ipcRenderer.removeAllListeners('player-state-changed')
        window.electron.ipcRenderer.removeAllListeners('player-error')
      }
    }
  }, [isElectron])

  // Return the hook interface
  return {
    // Display window management
    isDisplayWindowOpen,
    openDisplayWindow,
    closeDisplayWindow,

    // Player controls
    playVideo,
    pauseVideo,
    stopVideo,
    seekTo,
    setVolume,
    mute,
    unmute,
    getPlayerState,

    // Player state
    playerState,
    lastError,
  }
}

export default useYouTubePlayer
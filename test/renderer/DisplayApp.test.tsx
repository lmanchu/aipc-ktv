import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DisplayApp from '../../src/renderer/DisplayApp'
import { PlaybackState } from '../../src/shared/types'

// Mock YouTube IFrame API
const mockYouTubePlayer = {
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  stopVideo: vi.fn(),
  seekTo: vi.fn(),
  loadVideoById: vi.fn(),
  cueVideoById: vi.fn(),
  getCurrentTime: vi.fn().mockReturnValue(0),
  getDuration: vi.fn().mockReturnValue(0),
  getPlayerState: vi.fn().mockReturnValue(-1),
  setVolume: vi.fn(),
  getVolume: vi.fn().mockReturnValue(50),
  mute: vi.fn(),
  unMute: vi.fn(),
  isMuted: vi.fn().mockReturnValue(false),
  destroy: vi.fn(),
}

const mockYouTubeAPI = {
  Player: vi.fn().mockImplementation(() => mockYouTubePlayer),
  PlayerState: {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
  },
}

// Mock Electron IPC
const mockIpcRenderer = {
  sendMessage: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn(),
}

// Mock global objects
Object.defineProperty(window, 'YT', {
  value: mockYouTubeAPI,
  writable: true,
})

Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: mockIpcRenderer,
  },
  writable: true,
})

// Mock script loading
const mockCreateElement = vi.fn()
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true,
})

describe('DisplayApp YouTube Player Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock script element for YouTube API
    const mockScript = {
      src: '',
      async: false,
    }
    mockCreateElement.mockReturnValue(mockScript)
    
    // Mock document.head.appendChild
    const mockAppendChild = vi.fn()
    Object.defineProperty(document.head, 'appendChild', {
      value: mockAppendChild,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state initially', () => {
    render(<DisplayApp />)
    
    expect(screen.getByText('Loading YouTube Player...')).toBeInTheDocument()
    expect(screen.getByText('AIPC KTV')).toBeInTheDocument()
  })

  it('renders ready state when no video is provided', async () => {
    // Mock the YouTube API ready callback
    render(<DisplayApp />)
    
    // Simulate API ready
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(screen.getByText('Ready for Karaoke!')).toBeInTheDocument()
    })
  })

  it('renders with video when videoId is provided', async () => {
    const testVideoId = 'dQw4w9WgXcQ'
    render(<DisplayApp videoId={testVideoId} />)

    // Simulate API ready
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          videoId: testVideoId,
          playerVars: expect.objectContaining({
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
          }),
        })
      )
    })
  })

  it('initializes player with autoplay when specified', async () => {
    render(<DisplayApp videoId="test123" autoplay={true} />)

    // Simulate API ready
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          playerVars: expect.objectContaining({
            autoplay: 1,
          }),
        })
      )
    })
  })

  it('handles player ready event', async () => {
    render(<DisplayApp />)

    // Simulate API ready
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalled()
    })

    // Simulate player ready event
    const playerConfig = mockYouTubeAPI.Player.mock.calls[0]?.[1]
    if (playerConfig?.events?.onReady) {
      playerConfig.events.onReady({ target: mockYouTubePlayer })
    }

    await waitFor(() => {
      expect(screen.getByText('idle')).toBeInTheDocument()
    })
  })

  it('handles player state changes', async () => {
    render(<DisplayApp />)

    // Initialize player
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalled()
    })

    const playerConfig = mockYouTubeAPI.Player.mock.calls[0]?.[1]
    
    if (playerConfig?.events?.onStateChange) {
      // Test playing state
      playerConfig.events.onStateChange({ data: 1 }) // PLAYING
      await waitFor(() => {
        expect(screen.getByText('playing')).toBeInTheDocument()
      })

      // Test paused state
      playerConfig.events.onStateChange({ data: 2 }) // PAUSED
      await waitFor(() => {
        expect(screen.getByText('paused')).toBeInTheDocument()
      })

      // Test buffering state
      playerConfig.events.onStateChange({ data: 3 }) // BUFFERING
      await waitFor(() => {
        expect(screen.getByText('loading')).toBeInTheDocument()
      })
    }
  })

  it('sends video ended message via IPC', async () => {
    render(<DisplayApp />)

    // Initialize player
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalled()
    })

    const playerConfig = mockYouTubeAPI.Player.mock.calls[0]?.[1]
    
    if (playerConfig?.events?.onStateChange) {
      // Simulate video ended
      playerConfig.events.onStateChange({ data: 0 }) // ENDED
      expect(mockIpcRenderer.sendMessage).toHaveBeenCalledWith('video-ended')
    }
  })

  it('handles player errors gracefully', async () => {
    render(<DisplayApp />)

    // Initialize player
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalled()
    })

    const playerConfig = mockYouTubeAPI.Player.mock.calls[0]?.[1]
    
    if (playerConfig?.events?.onError) {
      // Test different error codes
      playerConfig.events.onError({ data: 2 }) // Invalid video ID
      await waitFor(() => {
        expect(screen.getByText('Invalid video ID')).toBeInTheDocument()
      })

      // Test retry functionality
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)
      
      await waitFor(() => {
        expect(mockYouTubeAPI.Player).toHaveBeenCalledTimes(2)
      })
    }
  })

  it('handles IPC player control messages', async () => {
    render(<DisplayApp />)

    // Initialize player and set ready state
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalled()
    })

    const playerConfig = mockYouTubeAPI.Player.mock.calls[0]?.[1]
    if (playerConfig?.events?.onReady) {
      playerConfig.events.onReady({ target: mockYouTubePlayer })
    }

    await waitFor(() => {
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('youtube-player-control', expect.any(Function))
    })

    // Get the IPC message handler
    const ipcHandlerCall = mockIpcRenderer.on.mock.calls.find(
      call => call[0] === 'youtube-player-control'
    )
    
    if (ipcHandlerCall) {
      const ipcHandler = ipcHandlerCall[1]

      // Test play-video command
      ipcHandler('play-video', 'newVideoId')
      expect(mockYouTubePlayer.loadVideoById).toHaveBeenCalledWith('newVideoId')

      // Test pause-video command
      ipcHandler('pause-video')
      expect(mockYouTubePlayer.pauseVideo).toHaveBeenCalled()

      // Test stop-video command
      ipcHandler('stop-video')
      expect(mockYouTubePlayer.stopVideo).toHaveBeenCalled()

      // Test seek-to command
      ipcHandler('seek-to', 30)
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(30, true)

      // Test set-volume command
      ipcHandler('set-volume', 75)
      expect(mockYouTubePlayer.setVolume).toHaveBeenCalledWith(75)

      // Test mute command
      ipcHandler('mute')
      expect(mockYouTubePlayer.mute).toHaveBeenCalled()

      // Test unmute command
      ipcHandler('unmute')
      expect(mockYouTubePlayer.unMute).toHaveBeenCalled()
    }
  })

  it('handles get-player-state command', async () => {
    render(<DisplayApp />)

    // Initialize player
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalled()
    })

    const playerConfig = mockYouTubeAPI.Player.mock.calls[0]?.[1]
    if (playerConfig?.events?.onReady) {
      playerConfig.events.onReady({ target: mockYouTubePlayer })
    }

    await waitFor(() => {
      expect(mockIpcRenderer.on).toHaveBeenCalled()
    })

    const ipcHandlerCall = mockIpcRenderer.on.mock.calls.find(
      call => call[0] === 'youtube-player-control'
    )
    
    if (ipcHandlerCall) {
      const ipcHandler = ipcHandlerCall[1]

      // Test get-player-state command
      ipcHandler('get-player-state')
      
      expect(mockIpcRenderer.sendMessage).toHaveBeenCalledWith('player-state-response', {
        state: PlaybackState.IDLE,
        currentTime: 0,
        duration: 0,
        volume: 50,
        isMuted: false,
      })
    }
  })

  it('cleans up player on unmount', () => {
    const { unmount } = render(<DisplayApp />)
    
    // Initialize player
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    unmount()

    expect(mockYouTubePlayer.destroy).toHaveBeenCalled()
  })

  it('handles IPC errors gracefully', async () => {
    render(<DisplayApp />)

    // Initialize player
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalled()
    })

    const playerConfig = mockYouTubeAPI.Player.mock.calls[0]?.[1]
    if (playerConfig?.events?.onReady) {
      playerConfig.events.onReady({ target: mockYouTubePlayer })
    }

    await waitFor(() => {
      expect(mockIpcRenderer.on).toHaveBeenCalled()
    })

    const ipcHandlerCall = mockIpcRenderer.on.mock.calls.find(
      call => call[0] === 'youtube-player-control'
    )
    
    if (ipcHandlerCall) {
      const ipcHandler = ipcHandlerCall[1]

      // Mock player method to throw error
      mockYouTubePlayer.loadVideoById.mockImplementation(() => {
        throw new Error('Test error')
      })

      // Test that IPC error doesn't crash the app
      expect(() => {
        ipcHandler('play-video', 'errorVideoId')
      }).not.toThrow()
    }
  })

  it('displays status indicators correctly', async () => {
    render(<DisplayApp videoId="test123" />)

    // Initialize player
    if (window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady()
    }

    await waitFor(() => {
      expect(mockYouTubeAPI.Player).toHaveBeenCalled()
    })

    const playerConfig = mockYouTubeAPI.Player.mock.calls[0]?.[1]
    if (playerConfig?.events?.onReady) {
      playerConfig.events.onReady({ target: mockYouTubePlayer })
    }

    await waitFor(() => {
      expect(screen.getByText('AIPC KTV Display')).toBeInTheDocument()
      expect(screen.getByText('idle')).toBeInTheDocument()
    })
  })
})
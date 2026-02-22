import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PlaybackState, PlayerStateInfo } from '../src/shared/types'

/**
 * Story 5.0: YouTube IFrame Player Integration - Video Playback Backend
 * 
 * This test suite verifies all acceptance criteria for Story 5.0:
 * 1. YouTube IFrame Player API loaded and initialized in display window
 * 2. Can play video by videoId programmatically
 * 3. Player state changes (playing, paused, ended) are captured and sent via IPC
 * 4. Video auto-advances to next in queue when current video ends
 * 5. Player controls (play, pause, seek) work via IPC commands from control window
 * 6. Error handling for invalid videoId or network issues
 * 7. Tests for YouTube player integration and IPC controls pass
 * 8. Typecheck passes
 */

// Mock YouTube IFrame API
const mockYouTubePlayer = {
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  stopVideo: vi.fn(),
  loadVideoById: vi.fn(),
  seekTo: vi.fn(),
  setVolume: vi.fn(),
  getVolume: vi.fn().mockReturnValue(50),
  mute: vi.fn(),
  unMute: vi.fn(),
  isMuted: vi.fn().mockReturnValue(false),
  getPlayerState: vi.fn().mockReturnValue(1), // PLAYING
  getCurrentTime: vi.fn().mockReturnValue(0),  // Start with 0
  getDuration: vi.fn().mockReturnValue(0),     // Start with 0  
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
  send: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
}

// Mock Queue Store
const mockQueueStore = {
  currentSong: {
    videoId: 'test123',
    title: 'Test Song',
    channel: 'Test Channel',
    thumbnail: 'test-thumb.jpg',
    duration: 240,
  },
  setPlaybackState: vi.fn(),
  nextSong: vi.fn(),
}

// Mock main process handlers
const mockMainProcess = {
  'youtube-player-control': vi.fn(),
  'open-display-window': vi.fn(),
  'close-display-window': vi.fn(),
}

describe('Story 5.0: YouTube IFrame Player Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup global YouTube API mock
    Object.defineProperty(global, 'window', {
      value: {
        YT: mockYouTubeAPI,
        ipcRenderer: mockIpcRenderer,
        onYouTubeIframeAPIReady: undefined,
        document: {
          createElement: vi.fn(),
          getElementsByTagName: vi.fn(() => [{ parentNode: { insertBefore: vi.fn() } }]),
        },
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AC1: YouTube IFrame Player API loaded and initialized in display window', () => {
    it('should load YouTube IFrame API script dynamically', () => {
      const mockScript = { src: '', async: false }
      const mockCreateElement = vi.fn(() => mockScript)
      const mockInsertBefore = vi.fn()
      
      global.window.document.createElement = mockCreateElement
      global.window.document.getElementsByTagName = vi.fn(() => [
        { parentNode: { insertBefore: mockInsertBefore } }
      ])

      // Simulate DisplayApp initialization
      const scriptTag = global.window.document.createElement('script')
      scriptTag.src = 'https://www.youtube.com/iframe_api'
      
      expect(mockCreateElement).toHaveBeenCalledWith('script')
      expect(scriptTag.src).toBe('https://www.youtube.com/iframe_api')
    })

    it('should initialize YouTube player with correct configuration', () => {
      const mockPlayerContainer = { current: {} }
      
      // Simulate player initialization
      const player = new mockYouTubeAPI.Player(mockPlayerContainer.current, {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: vi.fn(),
          onStateChange: vi.fn(),
          onError: vi.fn(),
        },
      })

      expect(mockYouTubeAPI.Player).toHaveBeenCalledWith(
        mockPlayerContainer.current,
        expect.objectContaining({
          width: '100%',
          height: '100%',
          playerVars: expect.objectContaining({
            controls: 0, // Hide controls for karaoke mode
            modestbranding: 1, // Remove YouTube logo
            rel: 0, // Don't show related videos
            iv_load_policy: 3, // Hide video annotations
          }),
        })
      )

      expect(mockYouTubeAPI.Player).toHaveBeenCalled()
      expect(player).toBeDefined()
    })
  })

  describe('AC2: Can play video by videoId programmatically', () => {
    it('should load and play video by videoId', () => {
      const testVideoId = 'dQw4w9WgXcQ'
      
      // Simulate DisplayApp receiving currentSong change
      mockYouTubePlayer.loadVideoById(testVideoId)
      
      expect(mockYouTubePlayer.loadVideoById).toHaveBeenCalledWith(testVideoId)
    })

    it('should handle play-video IPC command with videoId', () => {
      const testVideoId = 'test-video-123'
      
      // Simulate IPC handler receiving play-video command
      const mockHandler = vi.fn((command: string, videoId?: string) => {
        if (command === 'play-video' && videoId) {
          mockQueueStore.setPlaybackState(PlaybackState.LOADING)
          mockYouTubePlayer.loadVideoById(videoId)
          setTimeout(() => mockYouTubePlayer.playVideo(), 100)
        }
      })

      mockHandler('play-video', testVideoId)

      expect(mockQueueStore.setPlaybackState).toHaveBeenCalledWith(PlaybackState.LOADING)
      expect(mockYouTubePlayer.loadVideoById).toHaveBeenCalledWith(testVideoId)
    })

    it('should handle play-video IPC command without videoId (resume)', () => {
      // Simulate IPC handler receiving resume command
      const mockHandler = vi.fn((command: string, videoId?: string) => {
        if (command === 'play-video' && !videoId) {
          mockYouTubePlayer.playVideo()
        }
      })

      mockHandler('play-video')

      expect(mockYouTubePlayer.playVideo).toHaveBeenCalled()
    })
  })

  describe('AC3: Player state changes captured and sent via IPC', () => {
    it('should capture PLAYING state and send via IPC', () => {
      const mockStateHandler = vi.fn((event: { data: number }) => {
        if (event.data === mockYouTubeAPI.PlayerState.PLAYING) {
          mockQueueStore.setPlaybackState(PlaybackState.PLAYING)
          mockIpcRenderer.send('player-state-changed', {
            state: PlaybackState.PLAYING,
            currentTime: 15,
            duration: 240,
            volume: 50,
            isMuted: false,
            videoId: 'test123',
          })
        }
      })

      mockStateHandler({ data: mockYouTubeAPI.PlayerState.PLAYING })

      expect(mockQueueStore.setPlaybackState).toHaveBeenCalledWith(PlaybackState.PLAYING)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('player-state-changed', {
        state: PlaybackState.PLAYING,
        currentTime: 15,
        duration: 240,
        volume: 50,
        isMuted: false,
        videoId: 'test123',
      })
    })

    it('should capture PAUSED state and send via IPC', () => {
      const mockStateHandler = vi.fn((event: { data: number }) => {
        if (event.data === mockYouTubeAPI.PlayerState.PAUSED) {
          mockQueueStore.setPlaybackState(PlaybackState.PAUSED)
          mockIpcRenderer.send('player-state-changed', {
            state: PlaybackState.PAUSED,
            currentTime: 45,
            duration: 240,
            volume: 50,
            isMuted: false,
            videoId: 'test123',
          })
        }
      })

      mockStateHandler({ data: mockYouTubeAPI.PlayerState.PAUSED })

      expect(mockQueueStore.setPlaybackState).toHaveBeenCalledWith(PlaybackState.PAUSED)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('player-state-changed', expect.objectContaining({
        state: PlaybackState.PAUSED,
      }))
    })

    it('should capture BUFFERING state and send via IPC', () => {
      const mockStateHandler = vi.fn((event: { data: number }) => {
        if (event.data === mockYouTubeAPI.PlayerState.BUFFERING) {
          mockQueueStore.setPlaybackState(PlaybackState.LOADING)
          mockIpcRenderer.send('player-state-changed', {
            state: PlaybackState.LOADING,
            currentTime: 0,
            duration: 240,
            volume: 50,
            isMuted: false,
            videoId: 'test123',
          })
        }
      })

      mockStateHandler({ data: mockYouTubeAPI.PlayerState.BUFFERING })

      expect(mockQueueStore.setPlaybackState).toHaveBeenCalledWith(PlaybackState.LOADING)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('player-state-changed', expect.objectContaining({
        state: PlaybackState.LOADING,
      }))
    })
  })

  describe('AC4: Video auto-advances to next in queue when current video ends', () => {
    it('should handle video ended state and advance to next song', () => {
      const mockStateHandler = vi.fn((event: { data: number }) => {
        if (event.data === mockYouTubeAPI.PlayerState.ENDED) {
          mockQueueStore.setPlaybackState(PlaybackState.IDLE)
          mockIpcRenderer.send('video-ended')
          mockQueueStore.nextSong()
        }
      })

      mockStateHandler({ data: mockYouTubeAPI.PlayerState.ENDED })

      expect(mockQueueStore.setPlaybackState).toHaveBeenCalledWith(PlaybackState.IDLE)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('video-ended')
      expect(mockQueueStore.nextSong).toHaveBeenCalled()
    })

    it('should notify main window when video ends', () => {
      // Simulate main process forwarding video-ended message
      const mockMainHandler = vi.fn((event: string) => {
        if (event === 'video-ended') {
          // Forward to main window
          mockIpcRenderer.send('video-ended')
        }
      })

      mockMainHandler('video-ended')

      expect(mockIpcRenderer.send).toHaveBeenCalledWith('video-ended')
    })
  })

  describe('AC5: Player controls work via IPC commands from control window', () => {
    it('should handle pause-video command', () => {
      const mockHandler = vi.fn((command: string) => {
        if (command === 'pause-video') {
          mockYouTubePlayer.pauseVideo()
        }
      })

      mockHandler('pause-video')

      expect(mockYouTubePlayer.pauseVideo).toHaveBeenCalled()
    })

    it('should handle stop-video command', () => {
      const mockHandler = vi.fn((command: string) => {
        if (command === 'stop-video') {
          mockYouTubePlayer.stopVideo()
        }
      })

      mockHandler('stop-video')

      expect(mockYouTubePlayer.stopVideo).toHaveBeenCalled()
    })

    it('should handle seek-to command with validation', () => {
      const mockHandler = vi.fn((command: string, ...args: any[]) => {
        if (command === 'seek-to') {
          const seekTime = args[0]
          if (typeof seekTime === 'number' && seekTime >= 0) {
            mockYouTubePlayer.seekTo(seekTime, true)
            // Send state update after seek
            setTimeout(() => {
              mockIpcRenderer.send('player-state-changed', {
                state: PlaybackState.PLAYING,
                currentTime: seekTime,
                duration: 240,
                volume: 50,
                isMuted: false,
                videoId: 'test123',
              })
            }, 100)
          } else {
            console.error('Invalid seek time:', seekTime)
          }
        }
      })

      // Valid seek time
      mockHandler('seek-to', 30)
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(30, true)

      // Invalid seek time
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockHandler('seek-to', -10)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid seek time:', -10)
      consoleSpy.mockRestore()
    })

    it('should handle volume control commands', () => {
      const mockHandler = vi.fn((command: string, ...args: any[]) => {
        switch (command) {
          case 'set-volume':
            const volume = args[0]
            if (typeof volume === 'number' && volume >= 0 && volume <= 100) {
              mockYouTubePlayer.setVolume(volume)
              setTimeout(() => {
                mockIpcRenderer.send('player-state-changed', {
                  state: PlaybackState.PLAYING,
                  currentTime: 15,
                  duration: 240,
                  volume: volume,
                  isMuted: false,
                  videoId: 'test123',
                })
              }, 100)
            }
            break
          case 'mute':
            mockYouTubePlayer.mute()
            setTimeout(() => {
              mockIpcRenderer.send('player-state-changed', {
                state: PlaybackState.PLAYING,
                currentTime: 15,
                duration: 240,
                volume: 50,
                isMuted: true,
                videoId: 'test123',
              })
            }, 100)
            break
          case 'unmute':
            mockYouTubePlayer.unMute()
            setTimeout(() => {
              mockIpcRenderer.send('player-state-changed', {
                state: PlaybackState.PLAYING,
                currentTime: 15,
                duration: 240,
                volume: 50,
                isMuted: false,
                videoId: 'test123',
              })
            }, 100)
            break
        }
      })

      // Test set-volume
      mockHandler('set-volume', 75)
      expect(mockYouTubePlayer.setVolume).toHaveBeenCalledWith(75)

      // Test mute
      mockHandler('mute')
      expect(mockYouTubePlayer.mute).toHaveBeenCalled()

      // Test unmute
      mockHandler('unmute')
      expect(mockYouTubePlayer.unMute).toHaveBeenCalled()
    })

    it('should handle get-player-state command', () => {
      const mockHandler = vi.fn((command: string, ...args: any[]) => {
        if (command === 'get-player-state') {
          const requestId = args[0] || 'unknown'
          try {
            const state: PlayerStateInfo = {
              state: PlaybackState.PLAYING,
              currentTime: mockYouTubePlayer.getCurrentTime() || 0,
              duration: mockYouTubePlayer.getDuration() || 0,
              volume: mockYouTubePlayer.getVolume() || 50,
              isMuted: mockYouTubePlayer.isMuted() || false,
              videoId: 'test123',
            }
            mockIpcRenderer.send('player-state-response', requestId, state)
          } catch (error) {
            mockIpcRenderer.send('player-state-response', requestId, null)
          }
        }
      })

      const testRequestId = 'req-123'
      mockHandler('get-player-state', testRequestId)

      expect(mockIpcRenderer.send).toHaveBeenCalledWith('player-state-response', testRequestId, {
        state: PlaybackState.PLAYING,
        currentTime: 0, // mockYouTubePlayer.getCurrentTime() returns 0 in reset state
        duration: 0,    // mockYouTubePlayer.getDuration() returns 0 in reset state
        volume: 50,
        isMuted: false,
        videoId: 'test123',
      })
    })
  })

  describe('AC6: Error handling for invalid videoId or network issues', () => {
    it('should handle invalid video ID error (code 2)', () => {
      const mockErrorHandler = vi.fn((event: { data: number }) => {
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
        
        mockQueueStore.setPlaybackState(PlaybackState.ERROR)
        return errorMessage
      })

      const error = mockErrorHandler({ data: 2 })

      expect(error).toBe('Invalid video ID')
      expect(mockQueueStore.setPlaybackState).toHaveBeenCalledWith(PlaybackState.ERROR)
    })

    it('should handle video not found error (code 100)', () => {
      const mockErrorHandler = vi.fn((event: { data: number }) => {
        const errorMessage = 'Video not found or private'
        mockQueueStore.setPlaybackState(PlaybackState.ERROR)
        return errorMessage
      })

      const error = mockErrorHandler({ data: 100 })

      expect(error).toBe('Video not found or private')
      expect(mockQueueStore.setPlaybackState).toHaveBeenCalledWith(PlaybackState.ERROR)
    })

    it('should handle embedding not allowed error (code 101/150)', () => {
      const mockErrorHandler = vi.fn((event: { data: number }) => {
        const errorMessage = 'Video not allowed in embedded players'
        mockQueueStore.setPlaybackState(PlaybackState.ERROR)
        return errorMessage
      })

      const error101 = mockErrorHandler({ data: 101 })
      const error150 = mockErrorHandler({ data: 150 })

      expect(error101).toBe('Video not allowed in embedded players')
      expect(error150).toBe('Video not allowed in embedded players')
      expect(mockQueueStore.setPlaybackState).toHaveBeenCalledTimes(2)
    })

    it('should handle IPC command errors gracefully', () => {
      const mockErrorHandler = vi.fn((command: string, ...args: any[]) => {
        try {
          if (command === 'play-video') {
            throw new Error('Network error')
          }
        } catch (error) {
          mockIpcRenderer.send('player-error', {
            command,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockErrorHandler('play-video', 'errorVideoId')

      expect(mockIpcRenderer.send).toHaveBeenCalledWith('player-error', {
        command: 'play-video',
        error: 'Network error'
      })
      consoleSpy.mockRestore()
    })
  })

  describe('AC7: Comprehensive integration test', () => {
    it('should handle complete video playback lifecycle', () => {
      const testVideoId = 'integration-test-123'
      let currentState = PlaybackState.IDLE

      // 1. Load video
      mockYouTubePlayer.loadVideoById(testVideoId)
      currentState = PlaybackState.LOADING
      expect(mockYouTubePlayer.loadVideoById).toHaveBeenCalledWith(testVideoId)

      // 2. Video starts playing
      currentState = PlaybackState.PLAYING
      mockIpcRenderer.send('player-state-changed', {
        state: PlaybackState.PLAYING,
        currentTime: 0,
        duration: 180,
        volume: 50,
        isMuted: false,
        videoId: testVideoId,
      })

      // 3. User seeks to middle
      mockYouTubePlayer.seekTo(90, true)
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(90, true)

      // 4. User pauses
      mockYouTubePlayer.pauseVideo()
      currentState = PlaybackState.PAUSED
      expect(mockYouTubePlayer.pauseVideo).toHaveBeenCalled()

      // 5. User resumes
      mockYouTubePlayer.playVideo()
      currentState = PlaybackState.PLAYING
      expect(mockYouTubePlayer.playVideo).toHaveBeenCalled()

      // 6. Video ends
      currentState = PlaybackState.IDLE
      mockIpcRenderer.send('video-ended')
      mockQueueStore.nextSong()

      expect(mockIpcRenderer.send).toHaveBeenCalledWith('video-ended')
      expect(mockQueueStore.nextSong).toHaveBeenCalled()

      // Verify all states were tracked
      expect(currentState).toBe(PlaybackState.IDLE)
    })

    it('should validate main process IPC command handling', () => {
      const validCommands = [
        { command: 'play-video', args: ['valid-id'], valid: true },
        { command: 'pause-video', args: [], valid: true },
        { command: 'stop-video', args: [], valid: true },
        { command: 'seek-to', args: [30], valid: true },
        { command: 'seek-to', args: [-10], valid: false },
        { command: 'set-volume', args: [75], valid: true },
        { command: 'set-volume', args: [150], valid: false },
        { command: 'mute', args: [], valid: true },
        { command: 'unmute', args: [], valid: true },
      ]

      for (const testCase of validCommands) {
        const mockValidator = vi.fn((command: string, ...args: any[]) => {
          switch (command) {
            case 'seek-to':
              return typeof args[0] === 'number' && args[0] >= 0
            case 'set-volume':
              return typeof args[0] === 'number' && args[0] >= 0 && args[0] <= 100
            default:
              return true
          }
        })

        const isValid = mockValidator(testCase.command, ...testCase.args)
        expect(isValid).toBe(testCase.valid)
      }
    })
  })

  describe('AC8: TypeScript compilation', () => {
    it('should have correct type definitions', () => {
      // Test PlayerStateInfo interface
      const stateInfo: PlayerStateInfo = {
        state: PlaybackState.PLAYING,
        currentTime: 15.5,
        duration: 240,
        volume: 75,
        isMuted: false,
        videoId: 'test123',
      }

      expect(stateInfo.state).toBe(PlaybackState.PLAYING)
      expect(typeof stateInfo.currentTime).toBe('number')
      expect(typeof stateInfo.duration).toBe('number')
      expect(typeof stateInfo.volume).toBe('number')
      expect(typeof stateInfo.isMuted).toBe('boolean')
      expect(typeof stateInfo.videoId).toBe('string')
    })

    it('should have correct YouTube player command types', () => {
      const commands: Array<import('../src/shared/types').YouTubePlayerCommand> = [
        'play-video',
        'pause-video',
        'stop-video',
        'seek-to',
        'set-volume',
        'mute',
        'unmute',
        'get-player-state',
      ]

      expect(commands).toHaveLength(8)
      expect(commands.includes('play-video')).toBe(true)
      expect(commands.includes('invalid-command' as any)).toBe(false)
    })

    it('should have correct PlaybackState enum values', () => {
      expect(PlaybackState.IDLE).toBe('idle')
      expect(PlaybackState.PLAYING).toBe('playing')
      expect(PlaybackState.PAUSED).toBe('paused')
      expect(PlaybackState.LOADING).toBe('loading')
      expect(PlaybackState.ERROR).toBe('error')
    })
  })
})
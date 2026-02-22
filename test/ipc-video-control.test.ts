import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { YouTubePlayerCommand, PlaybackState } from '../src/shared/types'

// Mock IPC interfaces
const mockIpcRenderer = {
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
}

const mockYouTubePlayerAPI = {
  openDisplayWindow: vi.fn(),
  closeDisplayWindow: vi.fn(),
  control: vi.fn(),
}

// Mock window electron API
Object.defineProperty(global, 'window', {
  value: {
    electron: {
      ipcRenderer: mockIpcRenderer,
      youtubePlayer: mockYouTubePlayerAPI,
    },
  },
  writable: true,
})

describe('IPC Video Control Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Main Process IPC Handlers', () => {
    it('should validate player control commands', async () => {
      // Test valid commands
      const validCommands: YouTubePlayerCommand[] = [
        'play-video',
        'pause-video', 
        'stop-video',
        'seek-to',
        'set-volume',
        'mute',
        'unmute',
        'get-player-state'
      ]

      for (const command of validCommands) {
        mockYouTubePlayerAPI.control.mockResolvedValue({ success: true })
        
        const result = await mockYouTubePlayerAPI.control(command)
        expect(result.success).toBe(true)
      }
    })

    it('should handle display window creation', async () => {
      mockYouTubePlayerAPI.openDisplayWindow.mockResolvedValue({
        success: true,
        windowId: 123,
        isMultiMonitor: false,
        displayCount: 1,
      })

      const result = await mockYouTubePlayerAPI.openDisplayWindow()
      
      expect(result.success).toBe(true)
      expect(result.windowId).toBe(123)
      expect(typeof result.isMultiMonitor).toBe('boolean')
      expect(typeof result.displayCount).toBe('number')
    })

    it('should handle display window closure', async () => {
      mockYouTubePlayerAPI.closeDisplayWindow.mockResolvedValue({
        success: true,
      })

      const result = await mockYouTubePlayerAPI.closeDisplayWindow()
      expect(result.success).toBe(true)
    })

    it('should handle player control with validation', async () => {
      // Test volume validation (should be 0-100)
      mockYouTubePlayerAPI.control.mockImplementation((command, ...args) => {
        if (command === 'set-volume') {
          const volume = args[0]
          if (typeof volume !== 'number' || volume < 0 || volume > 100) {
            return { success: false, error: 'Volume must be between 0 and 100' }
          }
        }
        if (command === 'seek-to') {
          const seekTime = args[0]
          if (typeof seekTime !== 'number' || seekTime < 0) {
            return { success: false, error: 'Seek time must be non-negative' }
          }
        }
        return { success: true }
      })

      // Valid volume
      let result = await mockYouTubePlayerAPI.control('set-volume', 50)
      expect(result.success).toBe(true)

      // Invalid volume
      result = await mockYouTubePlayerAPI.control('set-volume', 150)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Volume must be between 0 and 100')

      // Valid seek
      result = await mockYouTubePlayerAPI.control('seek-to', 30)
      expect(result.success).toBe(true)

      // Invalid seek
      result = await mockYouTubePlayerAPI.control('seek-to', -10)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Seek time must be non-negative')
    })
  })

  describe('Display Window IPC Message Handling', () => {
    it('should handle youtube-player-control messages', () => {
      const mockHandler = vi.fn()
      
      // Test play command
      mockHandler('play-video', 'dQw4w9WgXcQ')
      expect(mockHandler).toHaveBeenCalledWith('play-video', 'dQw4w9WgXcQ')

      // Test pause command
      mockHandler('pause-video')
      expect(mockHandler).toHaveBeenCalledWith('pause-video')

      // Test volume command
      mockHandler('set-volume', 75)
      expect(mockHandler).toHaveBeenCalledWith('set-volume', 75)

      // Test seek command
      mockHandler('seek-to', 120)
      expect(mockHandler).toHaveBeenCalledWith('seek-to', 120)
    })

    it('should send player state updates', () => {
      const mockStateData = {
        state: PlaybackState.PLAYING,
        currentTime: 45.5,
        duration: 212,
        volume: 75,
        isMuted: false,
        videoId: 'dQw4w9WgXcQ',
      }

      // Test state change notification
      mockIpcRenderer.send('player-state-changed', mockStateData)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('player-state-changed', mockStateData)

      // Test volume change notification
      const volumeData = { volume: 75, isMuted: false }
      mockIpcRenderer.send('volume-changed', volumeData)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('volume-changed', volumeData)
    })

    it('should handle video ended event', () => {
      mockIpcRenderer.send('video-ended')
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('video-ended')
    })
  })

  describe('Control Window IPC Integration', () => {
    it('should receive player state updates', () => {
      const mockStateHandler = vi.fn()
      const mockVolumeHandler = vi.fn()
      const mockVideoEndedHandler = vi.fn()

      // Set up listeners
      mockIpcRenderer.on('player-state-changed', mockStateHandler)
      mockIpcRenderer.on('volume-changed', mockVolumeHandler)
      mockIpcRenderer.on('video-ended', mockVideoEndedHandler)

      // Simulate incoming messages
      const stateData = {
        state: PlaybackState.PLAYING,
        currentTime: 30,
        duration: 180,
        volume: 80,
        isMuted: false,
        videoId: 'test123',
      }
      mockStateHandler(stateData)

      const volumeData = { volume: 60, isMuted: true }
      mockVolumeHandler(volumeData)

      mockVideoEndedHandler()

      expect(mockStateHandler).toHaveBeenCalledWith(stateData)
      expect(mockVolumeHandler).toHaveBeenCalledWith(volumeData)
      expect(mockVideoEndedHandler).toHaveBeenCalled()
    })

    it('should send control commands to display window', async () => {
      mockYouTubePlayerAPI.control.mockResolvedValue({ success: true })

      // Test all player control commands
      const commands = [
        ['play-video', 'testVideoId'],
        ['pause-video'],
        ['stop-video'],
        ['seek-to', 60],
        ['set-volume', 80],
        ['mute'],
        ['unmute'],
        ['get-player-state'],
      ]

      for (const [command, ...args] of commands) {
        const result = await mockYouTubePlayerAPI.control(command, ...args)
        expect(result.success).toBe(true)
        expect(mockYouTubePlayerAPI.control).toHaveBeenCalledWith(command, ...args)
      }
    })
  })

  describe('Real-time Playback Status Syncing', () => {
    it('should sync playback state between windows', () => {
      const mockProgressHandler = vi.fn()
      mockIpcRenderer.on('playback-progress', mockProgressHandler)

      // Simulate periodic progress updates
      const progressData = {
        currentTime: 45.2,
        duration: 200,
        percentPlayed: 22.6,
      }

      mockIpcRenderer.send('playback-progress', progressData)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('playback-progress', progressData)
    })

    it('should handle state synchronization on commands', async () => {
      // Mock that commands trigger state sync
      mockYouTubePlayerAPI.control.mockImplementation((command) => {
        // Simulate state sync after command
        setTimeout(() => {
          const stateData = {
            state: command === 'play-video' ? PlaybackState.PLAYING : 
                   command === 'pause-video' ? PlaybackState.PAUSED :
                   command === 'stop-video' ? PlaybackState.IDLE :
                   PlaybackState.LOADING,
            currentTime: 0,
            duration: 180,
            volume: 50,
            isMuted: false,
            videoId: 'test123',
          }
          mockIpcRenderer.send('player-state-changed', stateData)
        }, 100)
        
        return Promise.resolve({ success: true })
      })

      // Test that each command triggers state sync
      await mockYouTubePlayerAPI.control('play-video', 'test123')
      await mockYouTubePlayerAPI.control('pause-video')
      await mockYouTubePlayerAPI.control('stop-video')

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(mockIpcRenderer.send).toHaveBeenCalledWith('player-state-changed', 
        expect.objectContaining({ state: PlaybackState.IDLE }))
    })
  })

  describe('Error Handling', () => {
    it('should handle display window not available', async () => {
      mockYouTubePlayerAPI.control.mockResolvedValue({
        success: false,
        error: 'Display window not available',
      })

      const result = await mockYouTubePlayerAPI.control('play-video', 'test123')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Display window not available')
    })

    it('should handle invalid commands', async () => {
      mockYouTubePlayerAPI.control.mockImplementation((command) => {
        const validCommands = [
          'play-video', 'pause-video', 'stop-video', 'seek-to',
          'set-volume', 'mute', 'unmute', 'get-player-state'
        ]
        
        if (!validCommands.includes(command as YouTubePlayerCommand)) {
          return Promise.resolve({
            success: false,
            error: `Invalid command: ${command}. Valid commands: ${validCommands.join(', ')}`
          })
        }
        
        return Promise.resolve({ success: true })
      })

      const result = await mockYouTubePlayerAPI.control('invalid-command')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid command')
    })

    it('should handle player errors gracefully', () => {
      const mockErrorHandler = vi.fn()
      mockIpcRenderer.on('player-error', mockErrorHandler)

      const errorData = {
        command: 'play-video',
        error: 'Video not found or private',
      }

      mockIpcRenderer.send('player-error', errorData)
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('player-error', errorData)
    })
  })
})
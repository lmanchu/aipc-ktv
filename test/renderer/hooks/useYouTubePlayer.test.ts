import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useYouTubePlayer } from '../../../src/renderer/hooks/useYouTubePlayer'
import { PlaybackState } from '../../../src/shared/types'

// Mock Electron API
const mockYouTubePlayerAPI = {
  openDisplayWindow: vi.fn(),
  closeDisplayWindow: vi.fn(),
  control: vi.fn(),
}

const mockIpcRenderer = {
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  sendMessage: vi.fn(),
  invoke: vi.fn(),
}

const mockElectronAPI = {
  youtubePlayer: mockYouTubePlayerAPI,
  ipcRenderer: mockIpcRenderer,
}

describe('useYouTubePlayer Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock window.electron
    Object.defineProperty(window, 'electron', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clean up window.electron
    if ('electron' in window) {
      delete (window as any).electron
    }
  })

  describe('Display Window Management', () => {
    it('should open display window successfully', async () => {
      mockYouTubePlayerAPI.openDisplayWindow.mockResolvedValue({
        success: true,
        windowId: 123,
      })

      const { result } = renderHook(() => useYouTubePlayer())

      await act(async () => {
        const success = await result.current.openDisplayWindow()
        expect(success).toBe(true)
      })

      expect(result.current.isDisplayWindowOpen).toBe(true)
      expect(result.current.lastError).toBe(null)
      expect(mockYouTubePlayerAPI.openDisplayWindow).toHaveBeenCalled()
    })

    it('should handle display window open failure', async () => {
      mockYouTubePlayerAPI.openDisplayWindow.mockResolvedValue({
        success: false,
        error: 'Failed to create window',
      })

      const { result } = renderHook(() => useYouTubePlayer())

      await act(async () => {
        const success = await result.current.openDisplayWindow()
        expect(success).toBe(false)
      })

      expect(result.current.isDisplayWindowOpen).toBe(false)
      expect(result.current.lastError).toBe('Failed to create window')
    })

    it('should close display window successfully', async () => {
      // First open the window
      mockYouTubePlayerAPI.openDisplayWindow.mockResolvedValue({
        success: true,
        windowId: 123,
      })
      mockYouTubePlayerAPI.closeDisplayWindow.mockResolvedValue({
        success: true,
      })

      const { result } = renderHook(() => useYouTubePlayer())

      // Open window
      await act(async () => {
        await result.current.openDisplayWindow()
      })

      expect(result.current.isDisplayWindowOpen).toBe(true)

      // Close window
      await act(async () => {
        const success = await result.current.closeDisplayWindow()
        expect(success).toBe(true)
      })

      expect(result.current.isDisplayWindowOpen).toBe(false)
      expect(result.current.playerState).toBe(null)
      expect(mockYouTubePlayerAPI.closeDisplayWindow).toHaveBeenCalled()
    })
  })

  describe('Player Controls', () => {
    beforeEach(() => {
      mockYouTubePlayerAPI.control.mockResolvedValue({ success: true })
    })

    it('should play video with videoId', async () => {
      const { result } = renderHook(() => useYouTubePlayer())

      await act(async () => {
        const success = await result.current.playVideo('dQw4w9WgXcQ')
        expect(success).toBe(true)
      })

      expect(mockYouTubePlayerAPI.control).toHaveBeenCalledWith('play-video', 'dQw4w9WgXcQ')
      expect(result.current.lastError).toBe(null)
    })

    it('should validate seek time', async () => {
      const { result } = renderHook(() => useYouTubePlayer())

      await act(async () => {
        const success = await result.current.seekTo(-10)
        expect(success).toBe(false)
      })

      expect(result.current.lastError).toBe('Seek time must be non-negative')
      expect(mockYouTubePlayerAPI.control).not.toHaveBeenCalled()
    })

    it('should validate volume range', async () => {
      const { result } = renderHook(() => useYouTubePlayer())

      // Test volume > 100
      await act(async () => {
        const success = await result.current.setVolume(150)
        expect(success).toBe(false)
      })

      expect(result.current.lastError).toBe('Volume must be between 0 and 100')
      expect(mockYouTubePlayerAPI.control).not.toHaveBeenCalled()
    })
  })

  describe('Non-Electron Environment', () => {
    beforeEach(() => {
      // Remove electron from window
      if ('electron' in window) {
        delete (window as any).electron
      }
    })

    it('should handle missing Electron API gracefully', async () => {
      const { result } = renderHook(() => useYouTubePlayer())

      await act(async () => {
        const success = await result.current.openDisplayWindow()
        expect(success).toBe(false)
      })

      await act(async () => {
        const success = await result.current.playVideo('test')
        expect(success).toBe(false)
      })

      expect(result.current.isDisplayWindowOpen).toBe(false)
      expect(result.current.playerState).toBe(null)
    })
  })
})
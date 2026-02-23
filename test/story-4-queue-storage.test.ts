import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QueueStorageService } from '../src/renderer/services/queueStorage'
import type { Queue, Song } from '../src/renderer/types'
import { PlaybackState } from '../src/renderer/types'

describe('QueueStorageService', () => {
  let service: QueueStorageService
  let mockStorage: any

  beforeEach(() => {
    QueueStorageService.resetInstance()
    vi.clearAllMocks()

    mockStorage = {
      read: vi.fn(),
      write: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
    }

    global.window = {
      ...global.window,
      electron: {
        storage: mockStorage,
      },
    } as any

    service = QueueStorageService.getInstance()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = QueueStorageService.getInstance()
      const instance2 = QueueStorageService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Initialization', () => {
    it('should initialize when window.electron.storage is available', () => {
      expect(() => service.load()).not.toThrow()
    })

    it('should return null when storage is not available', async () => {
      QueueStorageService.resetInstance()
      delete (global.window as any).electron
      service = QueueStorageService.getInstance()

      const result = await service.load()
      expect(result).toBeNull()
    })
  })

  describe('load() method', () => {
    const mockQueue: Queue = {
      currentSong: {
        videoId: 'test123',
        title: 'Test Song',
        channel: 'Test Channel',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 180,
      },
      upcomingSongs: [
        {
          videoId: 'test456',
          title: 'Test Song 2',
          channel: 'Test Channel 2',
          thumbnail: 'https://example.com/thumb2.jpg',
          duration: 240,
        },
      ],
      playbackState: PlaybackState.PLAYING,
    }

    it('should load queue successfully', async () => {
      mockStorage.read.mockResolvedValue({
        success: true,
        data: mockQueue,
      })

      const result = await service.load()
      expect(result).toEqual(mockQueue)
      expect(mockStorage.read).toHaveBeenCalledWith('queue.json')
    })

    it('should return null when read fails', async () => {
      mockStorage.read.mockResolvedValue({
        success: false,
        error: 'File not found',
      })

      const result = await service.load()
      expect(result).toBeNull()
    })

    it('should return null when data is undefined', async () => {
      mockStorage.read.mockResolvedValue({
        success: true,
        data: undefined,
      })

      const result = await service.load()
      expect(result).toBeNull()
    })

    it('should handle missing currentSong', async () => {
      const queueWithoutCurrent: Queue = {
        currentSong: null,
        upcomingSongs: [],
        playbackState: PlaybackState.IDLE,
      }

      mockStorage.read.mockResolvedValue({
        success: true,
        data: queueWithoutCurrent,
      })

      const result = await service.load()
      expect(result?.currentSong).toBeNull()
    })

    it('should handle missing upcomingSongs', async () => {
      const queueWithoutUpcoming: Queue = {
        currentSong: null,
        upcomingSongs: [],
        playbackState: PlaybackState.IDLE,
      }

      mockStorage.read.mockResolvedValue({
        success: true,
        data: queueWithoutUpcoming,
      })

      const result = await service.load()
      expect(result?.upcomingSongs).toEqual([])
    })
  })

  describe('save() method', () => {
    const mockQueue: Queue = {
      currentSong: null,
      upcomingSongs: [],
      playbackState: PlaybackState.IDLE,
    }

    it('should save queue successfully', async () => {
      mockStorage.write.mockResolvedValue({
        success: true,
      })

      const result = await service.save(mockQueue)
      expect(result).toBe(true)
      expect(mockStorage.write).toHaveBeenCalledWith('queue.json', mockQueue)
    })

    it('should return false when save fails', async () => {
      mockStorage.write.mockResolvedValue({
        success: false,
        error: 'Write failed',
      })

      const result = await service.save(mockQueue)
      expect(result).toBe(false)
    })

    it('should handle save errors gracefully', async () => {
      mockStorage.write.mockRejectedValue(new Error('Disk full'))

      const result = await service.save(mockQueue)
      expect(result).toBe(false)
    })
  })

  describe('exists() method', () => {
    it('should return true when file exists', async () => {
      mockStorage.exists.mockResolvedValue({
        success: true,
        exists: true,
      })

      const result = await service.exists()
      expect(result).toBe(true)
      expect(mockStorage.exists).toHaveBeenCalledWith('queue.json')
    })

    it('should return false when file does not exist', async () => {
      mockStorage.exists.mockResolvedValue({
        success: true,
        exists: false,
      })

      const result = await service.exists()
      expect(result).toBe(false)
    })

    it('should return false when exists check fails', async () => {
      mockStorage.exists.mockResolvedValue({
        success: false,
        error: 'Check failed',
      })

      const result = await service.exists()
      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockStorage.exists.mockRejectedValue(new Error('System error'))

      const result = await service.exists()
      expect(result).toBe(false)
    })
  })

  describe('getError() method', () => {
    it('should return error message from Error object', () => {
      const error = new Error('Test error')
      const result = service.getError(error)
      expect(result).toEqual({ message: 'Test error' })
    })

    it('should convert non-Error objects to string', () => {
      const error = 'String error'
      const result = service.getError(error)
      expect(result).toEqual({ message: 'String error' })
    })

    it('should handle null errors', () => {
      const error = null
      const result = service.getError(error)
      expect(result).toEqual({ message: 'null' })
    })
  })

  describe('Integration', () => {
    it('should save and load queue correctly', async () => {
      const mockQueue: Queue = {
        currentSong: {
          videoId: 'test123',
          title: 'Test Song',
          channel: 'Test Channel',
          thumbnail: 'https://example.com/thumb.jpg',
          duration: 180,
        },
        upcomingSongs: [],
        playbackState: PlaybackState.PLAYING,
      }

      mockStorage.write.mockResolvedValue({ success: true })
      mockStorage.read.mockResolvedValue({ success: true, data: mockQueue })

      await service.save(mockQueue)
      const loaded = await service.load()

      expect(loaded).toEqual(mockQueue)
    })
  })
})

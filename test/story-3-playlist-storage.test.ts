import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PlaylistStorageService } from '../src/renderer/services/playlistStorage'
import type { Playlist, Song } from '../src/renderer/types'

describe('PlaylistStorageService', () => {
  let service: PlaylistStorageService
  let mockStorage: any

  beforeEach(() => {
    PlaylistStorageService.resetInstance()
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

    service = PlaylistStorageService.getInstance()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = PlaylistStorageService.getInstance()
      const instance2 = PlaylistStorageService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Initialization', () => {
    it('should initialize when window.electron.storage is available', () => {
      expect(() => service.load()).not.toThrow()
    })

    it('should return empty array when storage is not available', async () => {
      PlaylistStorageService.resetInstance()
      delete (global.window as any).electron
      service = PlaylistStorageService.getInstance()
      const result = await service.load()
      expect(result).toEqual([])
    })
  })

  describe('load()', () => {
    const mockPlaylists: Playlist[] = [
      {
        id: 'playlist-1',
        name: 'Test Playlist',
        songs: [
          {
            videoId: 'abc123',
            title: 'Test Song',
            channel: 'Test Channel',
            thumbnail: 'https://example.com/thumb.jpg',
            duration: 180,
          },
        ],
        createdAt: Date.now(),
      },
    ]

    it('should load playlists from storage successfully', async () => {
      mockStorage.read.mockResolvedValue({
        success: true,
        data: mockPlaylists,
      })

      const result = await service.load()
      expect(result).toEqual(mockPlaylists)
      expect(mockStorage.read).toHaveBeenCalledWith('playlists.json')
    })

    it('should return empty array when storage returns null data', async () => {
      mockStorage.read.mockResolvedValue({
        success: true,
        data: null,
      })

      const result = await service.load()
      expect(result).toEqual([])
    })

    it('should return empty array when storage fails', async () => {
      mockStorage.read.mockResolvedValue({
        success: false,
        error: 'Failed to read file',
      })

      const result = await service.load()
      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      mockStorage.read.mockRejectedValue(new Error('Network error'))

      const result = await service.load()
      expect(result).toEqual([])
    })
  })

  describe('save()', () => {
    const mockPlaylists: Playlist[] = [
      {
        id: 'playlist-1',
        name: 'Test Playlist',
        songs: [],
        createdAt: Date.now(),
      },
    ]

    it('should save playlists to storage successfully', async () => {
      mockStorage.write.mockResolvedValue({
        success: true,
      })

      const result = await service.save(mockPlaylists)
      expect(result).toBe(true)
      expect(mockStorage.write).toHaveBeenCalledWith('playlists.json', mockPlaylists)
    })

    it('should return false when storage fails', async () => {
      mockStorage.write.mockResolvedValue({
        success: false,
        error: 'Failed to write file',
      })

      const result = await service.save(mockPlaylists)
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockStorage.write.mockRejectedValue(new Error('Network error'))

      const result = await service.save(mockPlaylists)
      expect(result).toBe(false)
    })
  })

  describe('exists()', () => {
    it('should return true when playlists file exists', async () => {
      mockStorage.exists.mockResolvedValue({
        success: true,
        exists: true,
      })

      const result = await service.exists()
      expect(result).toBe(true)
      expect(mockStorage.exists).toHaveBeenCalledWith('playlists.json')
    })

    it('should return false when playlists file does not exist', async () => {
      mockStorage.exists.mockResolvedValue({
        success: true,
        exists: false,
      })

      const result = await service.exists()
      expect(result).toBe(false)
    })

    it('should return false when storage check fails', async () => {
      mockStorage.exists.mockResolvedValue({
        success: false,
        error: 'Failed to check file',
      })

      const result = await service.exists()
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockStorage.exists.mockRejectedValue(new Error('Network error'))

      const result = await service.exists()
      expect(result).toBe(false)
    })
  })

  describe('getError()', () => {
    it('should format Error objects correctly', () => {
      const error = new Error('Test error')
      const result = service.getError(error)
      expect(result).toEqual({ message: 'Test error' })
    })

    it('should format string errors correctly', () => {
      const error = 'String error'
      const result = service.getError(error)
      expect(result).toEqual({ message: 'String error' })
    })

    it('should format unknown errors correctly', () => {
      const error = { custom: 'error' }
      const result = service.getError(error)
      expect(result).toEqual({ message: '[object Object]' })
    })
  })

  describe('Integration - Load and Save', () => {
    it('should save and load playlists correctly', async () => {
      const playlists: Playlist[] = [
        {
          id: 'playlist-1',
          name: 'Test Playlist',
          songs: [
            {
              videoId: 'abc123',
              title: 'Test Song',
              channel: 'Test Channel',
              thumbnail: 'https://example.com/thumb.jpg',
              duration: 180,
            },
          ],
          createdAt: Date.now(),
        },
      ]

      mockStorage.write.mockResolvedValue({ success: true })
      mockStorage.read.mockResolvedValue({ success: true, data: playlists })

      const saveResult = await service.save(playlists)
      expect(saveResult).toBe(true)

      const loadResult = await service.load()
      expect(loadResult).toEqual(playlists)
    })
  })
})

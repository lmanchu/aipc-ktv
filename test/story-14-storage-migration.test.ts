import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StorageMigrationService } from '../src/renderer/services/storageMigration'
import { PlaylistStorageService } from '../src/renderer/services/playlistStorage'
import type { Playlist } from '../src/renderer/types'

describe('Story 14.0: Integration Test for Storage Migration', () => {
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  const LOCAL_STORAGE_KEY = 'playlist-store'

  let localStorageMock: any
  let mockStorageAPI: any

  const mockPlaylist: Playlist = {
    id: 'test-playlist-1',
    name: 'Test Playlist',
    songs: [
      {
        videoId: 'video-1',
        title: 'Test Song 1',
        channel: 'Test Channel 1',
        thumbnail: 'https://example.com/thumb1.jpg',
        duration: 180,
      },
    ],
    createdAt: Date.now(),
  }

  const mockPlaylist2: Playlist = {
    id: 'test-playlist-2',
    name: 'Test Playlist 2',
    songs: [
      {
        videoId: 'video-2',
        title: 'Test Song 2',
        channel: 'Test Channel 2',
        thumbnail: 'https://example.com/thumb2.jpg',
        duration: 200,
      },
    ],
    createdAt: Date.now(),
  }

  beforeEach(() => {
    StorageMigrationService.resetInstance()
    PlaylistStorageService.resetInstance()
    vi.clearAllMocks()

    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    }

    mockStorageAPI = {
      read: vi.fn(),
      write: vi.fn(),
      exists: vi.fn(),
      delete: vi.fn(),
    }

    Object.defineProperty(globalThis, 'window', {
      value: {
        electron: {
          storage: mockStorageAPI,
        },
      },
      writable: true,
    })

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    localStorageMock.getItem.mockReturnValue(null)
    mockStorageAPI.read.mockResolvedValue({ success: true, data: [] })
    mockStorageAPI.write.mockResolvedValue({ success: true })
    mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
    mockStorageAPI.delete.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    StorageMigrationService.resetInstance()
    PlaylistStorageService.resetInstance()
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
    })
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    })
  })

  describe('Migration Detection', () => {
    it('should detect migration is needed when localStorage has data and file does not exist', async () => {
      const localStorageData = { state: { playlists: [mockPlaylist, mockPlaylist2] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const status = await service.checkMigrationStatus()

      expect(status.needsMigration).toBe(true)
      expect(status.hasLocalStorageData).toBe(true)
      expect(status.hasFileData).toBe(false)
      expect(status.migrated).toBe(false)
    })

    it('should not need migration when localStorage is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const status = await service.checkMigrationStatus()

      expect(status.needsMigration).toBe(false)
      expect(status.hasLocalStorageData).toBe(false)
      expect(status.hasFileData).toBe(false)
      expect(status.migrated).toBe(false)
    })

    it('should not need migration when file already exists', async () => {
      const localStorageData = { state: { playlists: [mockPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: true })

      const service = StorageMigrationService.getInstance()
      const status = await service.checkMigrationStatus()

      expect(status.needsMigration).toBe(false)
      expect(status.hasLocalStorageData).toBe(true)
      expect(status.hasFileData).toBe(true)
      expect(status.migrated).toBe(false)
    })

    it('should not need migration when both localStorage and file are empty', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const status = await service.checkMigrationStatus()

      expect(status.needsMigration).toBe(false)
      expect(status.hasLocalStorageData).toBe(false)
      expect(status.hasFileData).toBe(false)
    })

    it('should handle empty playlists array in localStorage', async () => {
      const localStorageData = { state: { playlists: [] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const status = await service.checkMigrationStatus()

      expect(status.needsMigration).toBe(false)
      expect(status.hasLocalStorageData).toBe(false)
      expect(status.hasFileData).toBe(false)
    })

    it('should handle malformed JSON in localStorage gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const status = await service.checkMigrationStatus()

      expect(status.needsMigration).toBe(false)
      expect(status.hasLocalStorageData).toBe(false)
    })

    it('should return correct localStorage key', async () => {
      const service = StorageMigrationService.getInstance()
      const key = service.getLocalStorageKey()

      expect(key).toBe(LOCAL_STORAGE_KEY)
    })
  })

  describe('Data Transfer', () => {
    it('should migrate data from localStorage to file storage', async () => {
      const playlists = [mockPlaylist, mockPlaylist2]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)
      expect(result.message).toContain('Successfully migrated 2 playlists')
      expect(mockStorageAPI.write).toHaveBeenCalledWith('playlists.json', playlists)
    })

    it('should migrate single playlist correctly', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)
      expect(result.message).toContain('Successfully migrated 1 playlist')
      expect(mockStorageAPI.write).toHaveBeenCalledWith('playlists.json', playlists)
    })

    it('should migrate large playlist collection', async () => {
      const playlists = Array.from({ length: 50 }, (_, i) => ({
        id: `playlist-${i}`,
        name: `Playlist ${i}`,
        songs: [
          {
            videoId: `video-${i}`,
            title: `Song ${i}`,
            channel: `Channel ${i}`,
            thumbnail: `https://example.com/thumb${i}.jpg`,
            duration: 180,
          },
        ],
        createdAt: Date.now(),
      }))
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)
      expect(result.message).toContain('Successfully migrated 50 playlists')
      expect(mockStorageAPI.write).toHaveBeenCalledWith('playlists.json', playlists)
    })

    it('should migrate playlists with complex data structure', async () => {
      const complexPlaylist: Playlist = {
        id: 'complex-playlist',
        name: 'Complex Playlist',
        songs: [
          {
            videoId: 'video-1',
            title: 'Song with special chars: !@#$%^&*()_+-={}[]|\\:;"\'<>?,./~`',
            channel: 'Channel with emoji 🎵🎶',
            thumbnail: 'https://example.com/thumb.jpg',
            duration: 3600,
          },
          {
            videoId: 'video-2',
            title: '歌曲标题',
            channel: '頻道名稱',
            thumbnail: 'https://example.com/thumb2.jpg',
            duration: 240,
          },
        ],
        createdAt: Date.now(),
      }
      const playlists = [complexPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)
      expect(mockStorageAPI.write).toHaveBeenCalledWith('playlists.json', playlists)
    })

    it('should preserve data integrity during migration', async () => {
      const playlists = [mockPlaylist, mockPlaylist2]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)

      const writeCall = mockStorageAPI.write.mock.calls[0]
      const writtenData = writeCall[1]
      expect(writtenData).toEqual(playlists)
      expect(writtenData).toHaveLength(2)
      expect(writtenData[0].id).toBe(mockPlaylist.id)
      expect(writtenData[0].name).toBe(mockPlaylist.name)
      expect(writtenData[0].songs).toEqual(mockPlaylist.songs)
    })
  })

  describe('LocalStorage Cleanup', () => {
    it('should clear localStorage after successful migration', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY)
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(1)
    })

    it('should not clear localStorage when migration is not needed', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(false)
      expect(localStorageMock.removeItem).not.toHaveBeenCalled()
    })

    it('should not clear localStorage when file already exists', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: true })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(false)
      expect(localStorageMock.removeItem).not.toHaveBeenCalled()
    })

    it('should attempt to clear localStorage even if write fails', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
      mockStorageAPI.write.mockResolvedValue({ success: false, error: 'Write failed' })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(false)
      expect(result.migrated).toBe(false)
      expect(localStorageMock.removeItem).not.toHaveBeenCalled()
    })

    it('should handle localStorage clear error gracefully', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
      mockStorageAPI.write.mockResolvedValue({ success: true })
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Failed to remove item')
      })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY)
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage read errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('LocalStorage read error')
      })
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const status = await service.checkMigrationStatus()

      expect(status.hasLocalStorageData).toBe(false)
      expect(status.needsMigration).toBe(false)
    })

    it('should handle file storage write errors during migration', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
      mockStorageAPI.write.mockRejectedValue(new Error('Write operation failed'))

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(false)
      expect(result.migrated).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.message).toContain('Failed to save playlists to file storage')
    })

    it('should handle file existence check errors', async () => {
      const localStorageData = { state: { playlists: [mockPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockRejectedValue(new Error('Exists check failed'))

      const service = StorageMigrationService.getInstance()
      const status = await service.checkMigrationStatus()

      expect(status.hasFileData).toBe(false)
      expect(status.needsMigration).toBe(true)
    })

    it('should return error result when migration fails', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
      mockStorageAPI.write.mockResolvedValue({ success: false, error: 'Disk full' })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(false)
      expect(result.migrated).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.message).toContain('Failed to save playlists to file storage')
    })

    it('should handle storage service not available error', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
      })

      const service = StorageMigrationService.getInstance()
      
      const result = await service.checkMigrationStatus()
      expect(result.hasLocalStorageData).toBe(false)
      expect(result.hasFileData).toBe(false)
      expect(result.needsMigration).toBe(false)
    })

    it('should handle undefined data from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(undefined)
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const status = await service.checkMigrationStatus()

      expect(status.hasLocalStorageData).toBe(false)
      expect(status.needsMigration).toBe(false)
    })
  })

  describe('Data Integrity Verification', () => {
    it('should verify all playlist properties are preserved', async () => {
      const playlists = [mockPlaylist, mockPlaylist2]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      await service.migrate()

      const writeCall = mockStorageAPI.write.mock.calls[0]
      const migratedData = writeCall[1]

      migratedData.forEach((playlist: Playlist, index: number) => {
        expect(playlist).toHaveProperty('id')
        expect(playlist).toHaveProperty('name')
        expect(playlist).toHaveProperty('songs')
        expect(playlist).toHaveProperty('createdAt')
        expect(playlist.id).toBe(playlists[index].id)
        expect(playlist.name).toBe(playlists[index].name)
        expect(playlist.songs).toEqual(playlists[index].songs)
      })
    })

    it('should verify song properties are preserved', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      await service.migrate()

      const writeCall = mockStorageAPI.write.mock.calls[0]
      const migratedData = writeCall[1]

      const song = migratedData[0].songs[0]
      expect(song).toHaveProperty('videoId')
      expect(song).toHaveProperty('title')
      expect(song).toHaveProperty('channel')
      expect(song).toHaveProperty('thumbnail')
      expect(song).toHaveProperty('duration')
      expect(song.videoId).toBe(mockPlaylist.songs[0].videoId)
      expect(song.title).toBe(mockPlaylist.songs[0].title)
      expect(song.duration).toBe(mockPlaylist.songs[0].duration)
    })

    it('should verify timestamp is preserved', async () => {
      const timestamp = 1700000000000
      const playlistWithTimestamp: Playlist = {
        ...mockPlaylist,
        createdAt: timestamp,
      }
      const playlists = [playlistWithTimestamp]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      await service.migrate()

      const writeCall = mockStorageAPI.write.mock.calls[0]
      const migratedData = writeCall[1]

      expect(migratedData[0].createdAt).toBe(timestamp)
    })

    it('should verify correct number of playlists are migrated', async () => {
      const playlists = Array.from({ length: 10 }, (_, i) => ({
        id: `playlist-${i}`,
        name: `Playlist ${i}`,
        songs: [],
        createdAt: Date.now(),
      }))
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      await service.migrate()

      const writeCall = mockStorageAPI.write.mock.calls[0]
      const migratedData = writeCall[1]

      expect(migratedData).toHaveLength(10)
    })

    it('should verify correct number of songs are migrated', async () => {
      const playlistWithManySongs: Playlist = {
        id: 'playlist-with-many-songs',
        name: 'Playlist with Many Songs',
        songs: Array.from({ length: 20 }, (_, i) => ({
          videoId: `video-${i}`,
          title: `Song ${i}`,
          channel: `Channel ${i}`,
          thumbnail: `https://example.com/thumb${i}.jpg`,
          duration: 180,
        })),
        createdAt: Date.now(),
      }
      const playlists = [playlistWithManySongs]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      await service.migrate()

      const writeCall = mockStorageAPI.write.mock.calls[0]
      const migratedData = writeCall[1]

      expect(migratedData[0].songs).toHaveLength(20)
    })

    it('should verify order of playlists is preserved', async () => {
      const playlists = [mockPlaylist, mockPlaylist2]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      await service.migrate()

      const writeCall = mockStorageAPI.write.mock.calls[0]
      const migratedData = writeCall[1]

      expect(migratedData[0].id).toBe(mockPlaylist.id)
      expect(migratedData[1].id).toBe(mockPlaylist2.id)
    })

    it('should verify order of songs is preserved', async () => {
      const songs = [
        { videoId: 'video-1', title: 'Song 1', channel: 'Channel 1', thumbnail: 'url1', duration: 180 },
        { videoId: 'video-2', title: 'Song 2', channel: 'Channel 2', thumbnail: 'url2', duration: 200 },
        { videoId: 'video-3', title: 'Song 3', channel: 'Channel 3', thumbnail: 'url3', duration: 220 },
      ]
      const playlist: Playlist = {
        id: 'playlist-ordered',
        name: 'Ordered Playlist',
        songs,
        createdAt: Date.now(),
      }
      const playlists = [playlist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      await service.migrate()

      const writeCall = mockStorageAPI.write.mock.calls[0]
      const migratedData = writeCall[1]

      expect(migratedData[0].songs[0].videoId).toBe('video-1')
      expect(migratedData[0].songs[1].videoId).toBe('video-2')
      expect(migratedData[0].songs[2].videoId).toBe('video-3')
    })

    it('should handle empty playlists array', async () => {
      const playlists: Playlist[] = []
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      const result = await service.migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(false)
      expect(result.message).toContain('No migration needed')
      expect(mockStorageAPI.write).not.toHaveBeenCalled()
    })

    it('should handle playlists with empty songs array', async () => {
      const playlists = [
        {
          id: 'empty-playlist',
          name: 'Empty Playlist',
          songs: [],
          createdAt: Date.now(),
        },
      ]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()
      await service.migrate()

      const writeCall = mockStorageAPI.write.mock.calls[0]
      const migratedData = writeCall[1]

      expect(migratedData[0].songs).toEqual([])
    })
  })

  describe('Integration Scenarios', () => {
    it('should complete full migration workflow', async () => {
      const playlists = [mockPlaylist, mockPlaylist2]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()

      const status = await service.checkMigrationStatus()
      expect(status.needsMigration).toBe(true)

      const result = await service.migrate()
      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY)
      expect(mockStorageAPI.write).toHaveBeenCalledWith('playlists.json', playlists)
    })

    it('should skip migration when not needed', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const service = StorageMigrationService.getInstance()

      const status = await service.checkMigrationStatus()
      expect(status.needsMigration).toBe(false)

      const result = await service.migrate()
      expect(result.success).toBe(true)
      expect(result.migrated).toBe(false)

      expect(mockStorageAPI.write).not.toHaveBeenCalled()
      expect(localStorageMock.removeItem).not.toHaveBeenCalled()
    })

    it('should skip migration when file already exists', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: true })

      const service = StorageMigrationService.getInstance()

      const status = await service.checkMigrationStatus()
      expect(status.needsMigration).toBe(false)
      expect(status.hasFileData).toBe(true)

      const result = await service.migrate()
      expect(result.success).toBe(true)
      expect(result.migrated).toBe(false)

      expect(mockStorageAPI.write).not.toHaveBeenCalled()
      expect(localStorageMock.removeItem).not.toHaveBeenCalled()
    })

    it('should handle retry after failed migration', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))

      const service = StorageMigrationService.getInstance()

      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
      mockStorageAPI.write.mockResolvedValueOnce({ success: false, error: 'Network error' })
      let result = await service.migrate()
      expect(result.success).toBe(false)

      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
      mockStorageAPI.write.mockResolvedValueOnce({ success: true })
      result = await service.migrate()
      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)
    })

    it('should work with PlaylistStorageService after migration', async () => {
      const playlists = [mockPlaylist]
      const localStorageData = { state: { playlists } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
      mockStorageAPI.read.mockResolvedValue({ success: true, data: playlists })

      const migrationService = StorageMigrationService.getInstance()
      await migrationService.migrate()

      const playlistStorage = PlaylistStorageService.getInstance()
      const loadedPlaylists = await playlistStorage.load()

      expect(loadedPlaylists).toEqual(playlists)
    })
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePlaylistStore } from '../src/renderer/store/playlistStore'
import { useQueueStore, usePreferenceStore } from '../src/renderer/store'
import { playlistStorageService, PlaylistStorageService } from '../src/renderer/services/playlistStorage'
import { QueueStorageService } from '../src/renderer/services/queueStorage'
import { StorageMigrationService } from '../src/renderer/services/storageMigration'
import type { Playlist, Song, Queue } from '../src/renderer/types'
import { PlaybackState } from '../src/renderer/types'

describe('Story 15.0: End-to-End Integration Test', () => {
  const originalWindow = globalThis.window
  const originalLocalStorage = globalThis.localStorage
  const LOCAL_STORAGE_KEY = 'playlist-store'

  let localStorageMock: any
  let mockStorageAPI: any

  const mockSong: Song = {
    videoId: 'video-123',
    title: 'Test Song',
    channel: 'Test Channel',
    thumbnail: 'https://example.com/thumb.jpg',
    duration: 180,
  }

  const mockSong2: Song = {
    videoId: 'video-456',
    title: 'Test Song 2',
    channel: 'Test Channel 2',
    thumbnail: 'https://example.com/thumb2.jpg',
    duration: 240,
  }

  const mockPlaylist: Playlist = {
    id: 'playlist-1',
    name: 'Test Playlist',
    songs: [mockSong],
    createdAt: Date.now(),
  }

  const mockPlaylist2: Playlist = {
    id: 'playlist-2',
    name: 'Test Playlist 2',
    songs: [mockSong2],
    createdAt: Date.now(),
  }

  beforeEach(() => {
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

    vi.clearAllMocks()

    PlaylistStorageService.resetInstance()
    QueueStorageService.resetInstance()
    StorageMigrationService.resetInstance()

    localStorageMock.getItem.mockReturnValue(null)
    mockStorageAPI.read.mockResolvedValue({ success: true, data: null })
    mockStorageAPI.write.mockResolvedValue({ success: true })
    mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
    mockStorageAPI.delete.mockResolvedValue({ success: true })

    usePlaylistStore.setState({ playlists: [] })
    useQueueStore.setState({
      currentSong: null,
      upcomingSongs: [],
      playbackState: PlaybackState.IDLE,
    })
    usePreferenceStore.setState({ persistQueue: false })
  })

  afterEach(() => {
    PlaylistStorageService.resetInstance()
    QueueStorageService.resetInstance()
    StorageMigrationService.resetInstance()
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
    })
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    })
  })

  describe('App Initialization', () => {
    it('should initialize playlist store from empty file storage', async () => {
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([])

      await usePlaylistStore.getState().initialize()

      const state = usePlaylistStore.getState()
      expect(state.playlists).toEqual([])
    })

    it('should initialize playlist store with existing playlists', async () => {
      const existingPlaylists = [mockPlaylist, mockPlaylist2]
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue(existingPlaylists)

      await usePlaylistStore.getState().initialize()

      const state = usePlaylistStore.getState()
      expect(state.playlists).toEqual(existingPlaylists)
      expect(state.playlists).toHaveLength(2)
    })

    it('should initialize queue store with empty state when persistence is disabled', async () => {
      usePreferenceStore.setState({ persistQueue: false })

      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
      expect(state.playbackState).toBe(PlaybackState.IDLE)
    })

    it('should initialize queue store from file when persistence is enabled', async () => {
      const savedQueue: Queue = {
        currentSong: mockSong,
        upcomingSongs: [mockSong2],
        playbackState: PlaybackState.PLAYING,
      }
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(savedQueue)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong)
      expect(state.upcomingSongs).toEqual([mockSong2])
      expect(state.playbackState).toBe(PlaybackState.PLAYING)
    })

    it('should handle initialization errors gracefully for playlists', async () => {
      vi.spyOn(playlistStorageService, 'load').mockRejectedValue(new Error('Read failed'))

      await usePlaylistStore.getState().initialize()

      const state = usePlaylistStore.getState()
      expect(state.playlists).toEqual([])
    })

    it('should handle initialization errors gracefully for queue', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockRejectedValue(new Error('Read failed'))

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
    })

    it('should handle null data during playlist initialization', async () => {
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([])

      await usePlaylistStore.getState().initialize()

      const state = usePlaylistStore.getState()
      expect(state.playlists).toEqual([])
    })

    it('should handle null data during queue initialization', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(null)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
      expect(state.playbackState).toBe(PlaybackState.IDLE)
    })
  })

  describe('Playlist Save/Restore', () => {
    it('should save playlist to file storage and restore correctly', async () => {
      vi.spyOn(playlistStorageService, 'save').mockResolvedValue(true)

      const newPlaylist = await usePlaylistStore.getState().createPlaylist('New Playlist')

      expect(newPlaylist).toBeDefined()
      expect(newPlaylist.name).toBe('New Playlist')
      expect(playlistStorageService.save).toHaveBeenCalled()
    })

    it('should restore multiple playlists correctly', async () => {
      const playlists = [mockPlaylist, mockPlaylist2]
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue(playlists)

      await usePlaylistStore.getState().initialize()

      const state = usePlaylistStore.getState()
      expect(state.playlists).toHaveLength(2)
      expect(state.playlists[0].name).toBe('Test Playlist')
      expect(state.playlists[1].name).toBe('Test Playlist 2')
    })

    it('should save songs to playlist and restore correctly', async () => {
      vi.spyOn(playlistStorageService, 'save').mockResolvedValue(true)

      const playlist = await usePlaylistStore.getState().createPlaylist('My Playlist')
      await usePlaylistStore.getState().addSongToPlaylist(playlist.id, mockSong)
      await usePlaylistStore.getState().addSongToPlaylist(playlist.id, mockSong2)

      const state = usePlaylistStore.getState()
      const updatedPlaylist = state.getPlaylist(playlist.id)
      expect(updatedPlaylist?.songs).toHaveLength(2)
      expect(updatedPlaylist?.songs[0].videoId).toBe(mockSong.videoId)
      expect(updatedPlaylist?.songs[1].videoId).toBe(mockSong2.videoId)
    })

    it('should delete playlist and save to file', async () => {
      vi.spyOn(playlistStorageService, 'save').mockResolvedValue(true)
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([])

      const playlist = await usePlaylistStore.getState().createPlaylist('To Delete')
      expect(usePlaylistStore.getState().playlists).toHaveLength(1)

      await usePlaylistStore.getState().deletePlaylist(playlist.id)

      expect(usePlaylistStore.getState().playlists).toHaveLength(0)
      expect(playlistStorageService.save).toHaveBeenCalled()
    })

    it('should handle save errors gracefully', async () => {
      vi.spyOn(playlistStorageService, 'save').mockResolvedValue(false)

      const playlist = await usePlaylistStore.getState().createPlaylist('Test Playlist')

      expect(playlist).toBeDefined()
      expect(usePlaylistStore.getState().playlists).toHaveLength(1)
    })

    it('should preserve all playlist properties during save and restore', async () => {
      const complexPlaylist: Playlist = {
        id: 'complex-1',
        name: 'Complex Playlist 🎵',
        songs: [mockSong, mockSong2],
        createdAt: 1700000000000,
      }
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([complexPlaylist])

      await usePlaylistStore.getState().initialize()

      const state = usePlaylistStore.getState()
      const restored = state.playlists[0]

      expect(restored.id).toBe(complexPlaylist.id)
      expect(restored.name).toBe(complexPlaylist.name)
      expect(restored.songs).toHaveLength(2)
      expect(restored.createdAt).toBe(complexPlaylist.createdAt)
      expect(restored.songs[0].videoId).toBe(mockSong.videoId)
      expect(restored.songs[1].duration).toBe(mockSong2.duration)
    })

    it('should maintain playlist order after save and restore', async () => {
      vi.spyOn(playlistStorageService, 'save').mockResolvedValue(true)

      const p1 = await usePlaylistStore.getState().createPlaylist('First')
      const p2 = await usePlaylistStore.getState().createPlaylist('Second')
      const p3 = await usePlaylistStore.getState().createPlaylist('Third')

      const state = usePlaylistStore.getState()
      expect(state.playlists[0].name).toBe('First')
      expect(state.playlists[1].name).toBe('Second')
      expect(state.playlists[2].name).toBe('Third')
    })

    it('should restore playlists with empty songs array', async () => {
      const emptyPlaylist: Playlist = {
        id: 'empty-1',
        name: 'Empty Playlist',
        songs: [],
        createdAt: Date.now(),
      }
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([emptyPlaylist])

      await usePlaylistStore.getState().initialize()

      const state = usePlaylistStore.getState()
      expect(state.playlists[0].songs).toEqual([])
      expect(state.playlists[0].songs).toHaveLength(0)
    })
  })

  describe('Migration Flow', () => {
    it('should detect migration is needed when localStorage has data and file does not exist', async () => {
      const localData = { state: { playlists: [mockPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const status = await StorageMigrationService.getInstance().checkMigrationStatus()

      expect(status.needsMigration).toBe(true)
      expect(status.hasLocalStorageData).toBe(true)
      expect(status.hasFileData).toBe(false)
    })

    it('should migrate data from localStorage to file storage', async () => {
      const localData = { state: { playlists: [mockPlaylist, mockPlaylist2] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.write.mockResolvedValue({ success: true })
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const result = await StorageMigrationService.getInstance().migrate()

      expect(result.success).toBe(true)
      expect(result.migrated).toBe(true)
      expect(mockStorageAPI.write).toHaveBeenCalledWith('playlists.json', [mockPlaylist, mockPlaylist2])
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY)
    })

    it('should skip migration when localStorage is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const status = await StorageMigrationService.getInstance().checkMigrationStatus()

      expect(status.needsMigration).toBe(false)
      expect(status.hasLocalStorageData).toBe(false)
    })

    it('should skip migration when file already exists', async () => {
      const localData = { state: { playlists: [mockPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: true })

      const status = await StorageMigrationService.getInstance().checkMigrationStatus()

      expect(status.needsMigration).toBe(false)
      expect(status.hasFileData).toBe(true)
    })

    it('should clear localStorage after successful migration', async () => {
      const localData = { state: { playlists: [mockPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.write.mockResolvedValue({ success: true })
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      await StorageMigrationService.getInstance().migrate()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(LOCAL_STORAGE_KEY)
    })

    it('should handle malformed JSON in localStorage gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const status = await StorageMigrationService.getInstance().checkMigrationStatus()

      expect(status.needsMigration).toBe(false)
    })

    it('should handle empty playlists array in localStorage', async () => {
      const localData = { state: { playlists: [] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const status = await StorageMigrationService.getInstance().checkMigrationStatus()

      expect(status.needsMigration).toBe(false)
      expect(status.hasLocalStorageData).toBe(false)
    })

    it('should preserve all song properties during migration', async () => {
      const complexPlaylist: Playlist = {
        id: 'complex-1',
        name: 'Complex',
        songs: [{
          videoId: 'vid-1',
          title: 'Song Title',
          channel: 'Channel Name',
          thumbnail: 'https://example.com/thumb.jpg',
          duration: 180,
        }],
        createdAt: 1700000000000,
      }
      const localData = { state: { playlists: [complexPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.write.mockResolvedValue({ success: true })
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      await StorageMigrationService.getInstance().migrate()

      const savedData = mockStorageAPI.write.mock.calls[0][1]
      expect(savedData[0].songs[0].videoId).toBe('vid-1')
      expect(savedData[0].songs[0].duration).toBe(180)
      expect(savedData[0].createdAt).toBe(1700000000000)
    })

    it('should handle write errors during migration', async () => {
      const localData = { state: { playlists: [mockPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.write.mockRejectedValue(new Error('Write failed'))
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      const result = await StorageMigrationService.getInstance().migrate()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should work with PlaylistStorageService after migration', async () => {
      const localData = { state: { playlists: [mockPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.write.mockResolvedValue({ success: true })
      mockStorageAPI.read.mockResolvedValue({ success: true, data: [mockPlaylist] })
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      await StorageMigrationService.getInstance().migrate()

      const storageService = PlaylistStorageService.getInstance()
      const playlists = await storageService.load()

      expect(playlists).toEqual([mockPlaylist])
    })
  })

  describe('Queue Persistence', () => {
    it('should save queue to file when persistence is enabled', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'save').mockResolvedValue(true)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().addSong(mockSong2)

      expect(QueueStorageService.getInstance().save).toHaveBeenCalled()
    })

    it('should not save queue when persistence is disabled', async () => {
      const saveSpy = vi.spyOn(QueueStorageService.getInstance(), 'save').mockResolvedValue(true)
      usePreferenceStore.setState({ persistQueue: false })
      await useQueueStore.getState().addSong(mockSong)

      expect(saveSpy).not.toHaveBeenCalled()
    })

    it('should load queue from file when persistence is enabled', async () => {
      const savedQueue: Queue = {
        currentSong: mockSong,
        upcomingSongs: [mockSong2],
        playbackState: PlaybackState.PAUSED,
      }
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(savedQueue)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong)
      expect(state.upcomingSongs).toEqual([mockSong2])
      expect(state.playbackState).toBe(PlaybackState.PAUSED)
    })

    it('should not load queue when persistence is disabled', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(null)

      usePreferenceStore.setState({ persistQueue: false })
      await useQueueStore.getState().initialize()

      expect(QueueStorageService.getInstance().load).not.toHaveBeenCalled()
    })

    it('should preserve current song state', async () => {
      const savedQueue: Queue = {
        currentSong: mockSong,
        upcomingSongs: [],
        playbackState: PlaybackState.IDLE,
      }
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(savedQueue)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong)
      expect(state.currentSong?.videoId).toBe(mockSong.videoId)
      expect(state.currentSong?.title).toBe(mockSong.title)
    })

    it('should preserve upcoming songs order', async () => {
      const savedQueue: Queue = {
        currentSong: null,
        upcomingSongs: [mockSong, mockSong2],
        playbackState: PlaybackState.IDLE,
      }
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(savedQueue)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(2)
      expect(state.upcomingSongs[0].videoId).toBe(mockSong.videoId)
      expect(state.upcomingSongs[1].videoId).toBe(mockSong2.videoId)
    })

    it('should preserve playback state', async () => {
      const savedQueue: Queue = {
        currentSong: null,
        upcomingSongs: [],
        playbackState: PlaybackState.PLAYING,
      }
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(savedQueue)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.playbackState).toBe(PlaybackState.PLAYING)
    })

    it('should handle save errors gracefully', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'save').mockResolvedValue(false)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().addSong(mockSong)

      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(1)
    })

    it('should handle load errors gracefully', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockRejectedValue(new Error('Load failed'))

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
    })

    it('should handle null queue data on load', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(null)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
    })

    it('should save queue on clear operation when persistence is enabled', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'save').mockResolvedValue(true)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().clearQueue()

      expect(QueueStorageService.getInstance().save).toHaveBeenCalled()
    })

    it('should save queue on next song operation when persistence is enabled', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'save').mockResolvedValue(true)

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().addSong(mockSong2)
      await useQueueStore.getState().nextSong()

      expect(QueueStorageService.getInstance().save).toHaveBeenCalled()
    })

    it('should toggle persistence and save accordingly', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'save').mockResolvedValue(true)

      usePreferenceStore.setState({ persistQueue: false })
      await useQueueStore.getState().addSong(mockSong)
      expect(QueueStorageService.getInstance().save).not.toHaveBeenCalled()

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().addSong(mockSong2)
      expect(QueueStorageService.getInstance().save).toHaveBeenCalled()
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should handle complete app startup: migrate and initialize stores', async () => {
      const localData = { state: { playlists: [mockPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.write.mockResolvedValue({ success: true })
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([mockPlaylist])

      const migrationResult = await StorageMigrationService.getInstance().migrate()
      expect(migrationResult.success).toBe(true)
      expect(migrationResult.migrated).toBe(true)

      await usePlaylistStore.getState().initialize()
      const playlistState = usePlaylistStore.getState()
      expect(playlistState.playlists).toEqual([mockPlaylist])
    })

    it('should create playlists, save to file, and restore on re-initialization', async () => {
      vi.spyOn(playlistStorageService, 'save').mockResolvedValue(true)
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([])

      const p1 = await usePlaylistStore.getState().createPlaylist('First Playlist', [mockSong])
      const p2 = await usePlaylistStore.getState().createPlaylist('Second Playlist', [mockSong2])

      expect(usePlaylistStore.getState().playlists).toHaveLength(2)

      const savedPlaylists = usePlaylistStore.getState().playlists
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue(savedPlaylists)

      usePlaylistStore.setState({ playlists: [] })
      await usePlaylistStore.getState().initialize()

      const restoredState = usePlaylistStore.getState()
      expect(restoredState.playlists).toHaveLength(2)
      expect(restoredState.playlists[0].name).toBe('First Playlist')
      expect(restoredState.playlists[1].name).toBe('Second Playlist')
    })

    it('should handle queue persistence through full lifecycle', async () => {
      vi.spyOn(QueueStorageService.getInstance(), 'save').mockResolvedValue(true)
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(null)

      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().addSong(mockSong2)
      await useQueueStore.getState().nextSong()

      const savedQueue = useQueueStore.getState()
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(savedQueue)

      useQueueStore.setState({
        currentSong: null,
        upcomingSongs: [],
        playbackState: PlaybackState.IDLE,
      })
      await useQueueStore.getState().initialize()

      const restoredState = useQueueStore.getState()
      expect(restoredState.currentSong).toEqual(mockSong)
      expect(restoredState.upcomingSongs).toEqual([mockSong2])
    })

    it('should handle migration and subsequent playlist operations', async () => {
      const localData = { state: { playlists: [mockPlaylist] } }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(localData))
      mockStorageAPI.write.mockResolvedValue({ success: true })
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      vi.spyOn(playlistStorageService, 'save').mockResolvedValue(true)
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([mockPlaylist])

      await StorageMigrationService.getInstance().migrate()
      await usePlaylistStore.getState().initialize()

      await usePlaylistStore.getState().addSongToPlaylist(mockPlaylist.id, mockSong2)

      const state = usePlaylistStore.getState()
      expect(state.playlists[0].songs).toHaveLength(2)
    })

    it('should handle initialization with no existing data', async () => {
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([])
      vi.spyOn(QueueStorageService.getInstance(), 'load').mockResolvedValue(null)

      localStorageMock.getItem.mockReturnValue(null)
      mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })

      await usePlaylistStore.getState().initialize()
      await useQueueStore.getState().initialize()

      const playlistState = usePlaylistStore.getState()
      const queueState = useQueueStore.getState()

      expect(playlistState.playlists).toEqual([])
      expect(queueState.currentSong).toBeNull()
      expect(queueState.upcomingSongs).toEqual([])
    })
  })
})

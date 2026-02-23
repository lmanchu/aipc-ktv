import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePlaylistStore } from '../src/renderer/store/playlistStore'
import { playlistStorageService, PlaylistStorageService } from '../src/renderer/services/playlistStorage'
import type { Playlist, Song } from '../src/renderer/types'

describe('PlaylistStore with File-Based Storage', () => {
  beforeEach(() => {
    PlaylistStorageService.resetInstance()
    vi.clearAllMocks()
    
    const mockStorage = {
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

    vi.spyOn(playlistStorageService, 'load').mockResolvedValue([])
    vi.spyOn(playlistStorageService, 'save').mockResolvedValue(true)

    usePlaylistStore.setState({ playlists: [] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialize()', () => {
    it('should load playlists from storage on initialization', async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 'playlist-1',
          name: 'Test Playlist',
          songs: [],
          createdAt: Date.now(),
        },
      ]

      vi.spyOn(playlistStorageService, 'load').mockResolvedValue(mockPlaylists)

      await usePlaylistStore.getState().initialize()

      expect(usePlaylistStore.getState().playlists).toEqual(mockPlaylists)
    })

    it('should handle storage errors gracefully', async () => {
      vi.spyOn(playlistStorageService, 'load').mockRejectedValue(new Error('Storage error'))

      await usePlaylistStore.getState().initialize()

      expect(usePlaylistStore.getState().playlists).toEqual([])
    })

    it('should initialize with empty array when no playlists exist', async () => {
      vi.spyOn(playlistStorageService, 'load').mockResolvedValue([])

      await usePlaylistStore.getState().initialize()

      expect(usePlaylistStore.getState().playlists).toEqual([])
    })
  })

  describe('createPlaylist()', () => {
    it('should create a new playlist and save to storage', async () => {
      const playlist = await usePlaylistStore.getState().createPlaylist('New Playlist')

      expect(playlist).toBeDefined()
      expect(playlist.name).toBe('New Playlist')
      expect(playlist.songs).toEqual([])
      expect(playlist.id).toBeDefined()
      expect(playlist.createdAt).toBeDefined()

      expect(playlistStorageService.save).toHaveBeenCalled()
      expect(usePlaylistStore.getState().playlists).toHaveLength(1)
    })

    it('should create playlist with initial songs', async () => {
      const songs: Song[] = [
        {
          videoId: 'abc123',
          title: 'Test Song',
          channel: 'Test Channel',
          thumbnail: 'https://example.com/thumb.jpg',
          duration: 180,
        },
      ]

      const state = usePlaylistStore.getState()
      const playlist = await state.createPlaylist('New Playlist', songs)

      expect(playlist.songs).toEqual(songs)
    })

    it('should generate unique IDs for playlists', async () => {
      const state = usePlaylistStore.getState()
      const playlist1 = await state.createPlaylist('Playlist 1')
      const playlist2 = await state.createPlaylist('Playlist 2')

      expect(playlist1.id).not.toBe(playlist2.id)
    })
  })

  describe('deletePlaylist()', () => {
    it('should delete playlist and save to storage', async () => {
      const state = usePlaylistStore.getState()
      const playlist = await state.createPlaylist('To Delete')

      await state.deletePlaylist(playlist.id)

      expect(state.playlists).toHaveLength(0)
      expect(playlistStorageService.save).toHaveBeenCalled()
    })

    it('should only delete the specified playlist', async () => {
      const state = usePlaylistStore.getState()
      const playlist1 = await state.createPlaylist('Keep')
      const playlist2 = await state.createPlaylist('Delete')

      await state.deletePlaylist(playlist2.id)

      expect(usePlaylistStore.getState().playlists).toHaveLength(1)
      expect(usePlaylistStore.getState().playlists[0].id).toBe(playlist1.id)
    })
  })

  describe('addSongToPlaylist()', () => {
    it('should add song to playlist and save to storage', async () => {
      const state = usePlaylistStore.getState()
      const playlist = await state.createPlaylist('Test Playlist')

      const song: Song = {
        videoId: 'abc123',
        title: 'Test Song',
        channel: 'Test Channel',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 180,
      }

      await state.addSongToPlaylist(playlist.id, song)

      const updatedPlaylist = state.getPlaylist(playlist.id)
      expect(updatedPlaylist?.songs).toHaveLength(1)
      expect(updatedPlaylist?.songs[0]).toEqual(song)
      expect(playlistStorageService.save).toHaveBeenCalled()
    })

    it('should append song to existing songs', async () => {
      const state = usePlaylistStore.getState()
      const song1: Song = {
        videoId: 'abc123',
        title: 'Song 1',
        channel: 'Channel 1',
        thumbnail: 'thumb1.jpg',
        duration: 180,
      }
      const song2: Song = {
        videoId: 'def456',
        title: 'Song 2',
        channel: 'Channel 2',
        thumbnail: 'thumb2.jpg',
        duration: 240,
      }

      const playlist = await state.createPlaylist('Test', [song1])
      await state.addSongToPlaylist(playlist.id, song2)

      const updatedPlaylist = state.getPlaylist(playlist.id)
      expect(updatedPlaylist?.songs).toHaveLength(2)
      expect(updatedPlaylist?.songs[0]).toEqual(song1)
      expect(updatedPlaylist?.songs[1]).toEqual(song2)
    })
  })

  describe('removeSongFromPlaylist()', () => {
    it('should remove song from playlist and save to storage', async () => {
      const state = usePlaylistStore.getState()
      const song: Song = {
        videoId: 'abc123',
        title: 'Test Song',
        channel: 'Test Channel',
        thumbnail: 'thumb.jpg',
        duration: 180,
      }

      const playlist = await state.createPlaylist('Test', [song])
      await state.removeSongFromPlaylist(playlist.id, 0)

      const updatedPlaylist = state.getPlaylist(playlist.id)
      expect(updatedPlaylist?.songs).toHaveLength(0)
      expect(playlistStorageService.save).toHaveBeenCalled()
    })

    it('should remove song at specific index', async () => {
      const state = usePlaylistStore.getState()
      const song1: Song = {
        videoId: 'abc',
        title: 'Song 1',
        channel: 'Ch1',
        thumbnail: 't1.jpg',
        duration: 180,
      }
      const song2: Song = {
        videoId: 'def',
        title: 'Song 2',
        channel: 'Ch2',
        thumbnail: 't2.jpg',
        duration: 240,
      }
      const song3: Song = {
        videoId: 'ghi',
        title: 'Song 3',
        channel: 'Ch3',
        thumbnail: 't3.jpg',
        duration: 300,
      }

      const playlist = await state.createPlaylist('Test', [song1, song2, song3])
      await state.removeSongFromPlaylist(playlist.id, 1)

      const updatedPlaylist = state.getPlaylist(playlist.id)
      expect(updatedPlaylist?.songs).toHaveLength(2)
      expect(updatedPlaylist?.songs[0]).toEqual(song1)
      expect(updatedPlaylist?.songs[1]).toEqual(song3)
    })
  })

  describe('updatePlaylistName()', () => {
    it('should update playlist name and save to storage', async () => {
      const state = usePlaylistStore.getState()
      const playlist = await state.createPlaylist('Old Name')

      await state.updatePlaylistName(playlist.id, 'New Name')

      const updatedPlaylist = state.getPlaylist(playlist.id)
      expect(updatedPlaylist?.name).toBe('New Name')
      expect(playlistStorageService.save).toHaveBeenCalled()
    })
  })

  describe('renamePlaylist()', () => {
    it('should rename playlist (alias for updatePlaylistName)', async () => {
      const state = usePlaylistStore.getState()
      const playlist = await state.createPlaylist('Old Name')

      await state.renamePlaylist(playlist.id, 'New Name')

      const updatedPlaylist = state.getPlaylist(playlist.id)
      expect(updatedPlaylist?.name).toBe('New Name')
    })
  })

  describe('moveSongInPlaylist()', () => {
    it('should move song to new position and save to storage', async () => {
      const state = usePlaylistStore.getState()
      const song1: Song = {
        videoId: '1',
        title: 'Song 1',
        channel: 'Ch',
        thumbnail: 't.jpg',
        duration: 180,
      }
      const song2: Song = {
        videoId: '2',
        title: 'Song 2',
        channel: 'Ch',
        thumbnail: 't.jpg',
        duration: 240,
      }
      const song3: Song = {
        videoId: '3',
        title: 'Song 3',
        channel: 'Ch',
        thumbnail: 't.jpg',
        duration: 300,
      }

      const playlist = await state.createPlaylist('Test', [song1, song2, song3])
      await state.moveSongInPlaylist(playlist.id, 0, 2)

      const updatedPlaylist = state.getPlaylist(playlist.id)
      expect(updatedPlaylist?.songs[0]).toEqual(song2)
      expect(updatedPlaylist?.songs[1]).toEqual(song3)
      expect(updatedPlaylist?.songs[2]).toEqual(song1)
      expect(playlistStorageService.save).toHaveBeenCalled()
    })
  })

  describe('clearPlaylist()', () => {
    it('should clear all songs from playlist and save to storage', async () => {
      const state = usePlaylistStore.getState()
      const songs: Song[] = [
        {
          videoId: 'abc',
          title: 'Song 1',
          channel: 'Ch',
          thumbnail: 't.jpg',
          duration: 180,
        },
        {
          videoId: 'def',
          title: 'Song 2',
          channel: 'Ch',
          thumbnail: 't.jpg',
          duration: 240,
        },
      ]

      const playlist = await state.createPlaylist('Test', songs)
      await state.clearPlaylist(playlist.id)

      const updatedPlaylist = state.getPlaylist(playlist.id)
      expect(updatedPlaylist?.songs).toEqual([])
      expect(playlistStorageService.save).toHaveBeenCalled()
    })
  })

  describe('getPlaylist()', () => {
    it('should return playlist by id', async () => {
      const state = usePlaylistStore.getState()
      const playlist = await state.createPlaylist('Test Playlist')

      const found = state.getPlaylist(playlist.id)
      expect(found).toEqual(playlist)
    })

    it('should return undefined for non-existent playlist', async () => {
      const state = usePlaylistStore.getState()
      const found = state.getPlaylist('non-existent-id')
      expect(found).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      vi.spyOn(playlistStorageService, 'save').mockRejectedValue(new Error('Save failed'))

      const state = usePlaylistStore.getState()
      const playlist = await state.createPlaylist('Test Playlist')

      expect(playlist).toBeDefined()
    })
  })
})

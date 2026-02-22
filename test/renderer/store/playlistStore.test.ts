import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlaylistStore } from '../../../src/renderer/store/playlistStore'
import { useQueueStore } from '../../../src/renderer/store/queueStore'
import type { Song } from '../../../src/renderer/types'

// Mock data
const mockSong1: Song = {
  videoId: 'dQw4w9WgXcQ',
  title: 'Never Gonna Give You Up',
  channel: 'RickAstleyVEVO',
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
  duration: 212,
}

const mockSong2: Song = {
  videoId: 'M5V_IXMewl4',
  title: 'Hello',
  channel: 'AdeleVEVO',
  thumbnail: 'https://i.ytimg.com/vi/M5V_IXMewl4/default.jpg',
  duration: 295,
}

const mockSong3: Song = {
  videoId: 'kJQP7kiw5Fk',
  title: 'Despacito',
  channel: 'LuisFonsiVEVO',
  thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/default.jpg',
  duration: 281,
}

describe('Playlist Store', () => {
  beforeEach(() => {
    // Clear all playlists before each test
    const state = usePlaylistStore.getState()
    state.playlists.forEach(playlist => {
      state.deletePlaylist(playlist.id)
    })
    
    // Clear queue as well
    useQueueStore.getState().clearQueue()
  })

  describe('Initial State', () => {
    it('should have empty playlists array initially', () => {
      const state = usePlaylistStore.getState()
      expect(state.playlists).toEqual([])
    })
  })

  describe('createPlaylist action', () => {
    it('should create a new playlist with name', () => {
      const { createPlaylist } = usePlaylistStore.getState()
      
      createPlaylist('My Playlist')
      
      const state = usePlaylistStore.getState()
      expect(state.playlists).toHaveLength(1)
      
      const playlist = state.playlists[0]
      expect(playlist.name).toBe('My Playlist')
      expect(playlist.songs).toEqual([])
      expect(typeof playlist.id).toBe('string')
      expect(playlist.id.length).toBeGreaterThan(0)
      expect(playlist.createdAt).toBeTypeOf('number')
      expect(playlist.createdAt).toBeGreaterThan(0)
    })

    it('should create playlist with initial songs', () => {
      const { createPlaylist } = usePlaylistStore.getState()
      
      createPlaylist('Rock Playlist', [mockSong1, mockSong2])
      
      const state = usePlaylistStore.getState()
      const playlist = state.playlists[0]
      
      expect(playlist.songs).toHaveLength(2)
      expect(playlist.songs[0]).toEqual(mockSong1)
      expect(playlist.songs[1]).toEqual(mockSong2)
    })

    it('should generate unique IDs for multiple playlists', () => {
      const { createPlaylist } = usePlaylistStore.getState()
      
      createPlaylist('Playlist 1')
      createPlaylist('Playlist 2')
      
      const state = usePlaylistStore.getState()
      expect(state.playlists).toHaveLength(2)
      expect(state.playlists[0].id).not.toBe(state.playlists[1].id)
    })
  })

  describe('deletePlaylist action', () => {
    it('should delete playlist by ID', () => {
      const { createPlaylist, deletePlaylist } = usePlaylistStore.getState()
      
      createPlaylist('Playlist 1')
      createPlaylist('Playlist 2')
      
      const stateBefore = usePlaylistStore.getState()
      const playlistIdToDelete = stateBefore.playlists[0].id
      
      deletePlaylist(playlistIdToDelete)
      
      const stateAfter = usePlaylistStore.getState()
      expect(stateAfter.playlists).toHaveLength(1)
      expect(stateAfter.playlists[0].name).toBe('Playlist 2')
      expect(stateAfter.playlists.find(p => p.id === playlistIdToDelete)).toBeUndefined()
    })

    it('should handle deleting non-existent playlist', () => {
      const { createPlaylist, deletePlaylist } = usePlaylistStore.getState()
      
      createPlaylist('Test Playlist')
      
      deletePlaylist('non-existent-id')
      
      const state = usePlaylistStore.getState()
      expect(state.playlists).toHaveLength(1)
      expect(state.playlists[0].name).toBe('Test Playlist')
    })
  })

  describe('addSongToPlaylist action', () => {
    it('should add song to existing playlist', () => {
      const { createPlaylist, addSongToPlaylist } = usePlaylistStore.getState()
      
      createPlaylist('My Playlist')
      const playlistId = usePlaylistStore.getState().playlists[0].id
      
      addSongToPlaylist(playlistId, mockSong1)
      
      const state = usePlaylistStore.getState()
      const playlist = state.playlists[0]
      expect(playlist.songs).toHaveLength(1)
      expect(playlist.songs[0]).toEqual(mockSong1)
    })

    it('should add multiple songs to playlist', () => {
      const { createPlaylist, addSongToPlaylist } = usePlaylistStore.getState()
      
      createPlaylist('Multi-song Playlist')
      const playlistId = usePlaylistStore.getState().playlists[0].id
      
      addSongToPlaylist(playlistId, mockSong1)
      addSongToPlaylist(playlistId, mockSong2)
      addSongToPlaylist(playlistId, mockSong3)
      
      const state = usePlaylistStore.getState()
      const playlist = state.playlists[0]
      expect(playlist.songs).toHaveLength(3)
      expect(playlist.songs[0]).toEqual(mockSong1)
      expect(playlist.songs[1]).toEqual(mockSong2)
      expect(playlist.songs[2]).toEqual(mockSong3)
    })

    it('should handle adding to non-existent playlist', () => {
      const { addSongToPlaylist } = usePlaylistStore.getState()
      
      // Should not throw error, just do nothing
      addSongToPlaylist('non-existent-id', mockSong1)
      
      const state = usePlaylistStore.getState()
      expect(state.playlists).toHaveLength(0)
    })
  })

  describe('removeSongFromPlaylist action', () => {
    it('should remove song from playlist by index', () => {
      const { createPlaylist, removeSongFromPlaylist } = usePlaylistStore.getState()
      
      createPlaylist('Test Playlist', [mockSong1, mockSong2, mockSong3])
      const playlistId = usePlaylistStore.getState().playlists[0].id
      
      removeSongFromPlaylist(playlistId, 1) // Remove middle song
      
      const state = usePlaylistStore.getState()
      const playlist = state.playlists[0]
      expect(playlist.songs).toHaveLength(2)
      expect(playlist.songs[0]).toEqual(mockSong1)
      expect(playlist.songs[1]).toEqual(mockSong3)
    })

    it('should handle removing from non-existent playlist', () => {
      const { removeSongFromPlaylist } = usePlaylistStore.getState()
      
      removeSongFromPlaylist('non-existent-id', 0)
      
      const state = usePlaylistStore.getState()
      expect(state.playlists).toHaveLength(0)
    })
  })

  describe('updatePlaylistName action', () => {
    it('should update playlist name', () => {
      const { createPlaylist, updatePlaylistName } = usePlaylistStore.getState()
      
      createPlaylist('Old Name')
      const playlistId = usePlaylistStore.getState().playlists[0].id
      
      updatePlaylistName(playlistId, 'New Name')
      
      const state = usePlaylistStore.getState()
      const playlist = state.playlists[0]
      expect(playlist.name).toBe('New Name')
    })

    it('should handle updating non-existent playlist', () => {
      const { createPlaylist, updatePlaylistName } = usePlaylistStore.getState()
      
      createPlaylist('Test Playlist')
      
      updatePlaylistName('non-existent-id', 'New Name')
      
      const state = usePlaylistStore.getState()
      expect(state.playlists[0].name).toBe('Test Playlist')
    })
  })

  describe('loadPlaylistToQueue action', () => {
    it('should load playlist songs to queue (append mode)', () => {
      const { createPlaylist, loadPlaylistToQueue } = usePlaylistStore.getState()
      const { addSong } = useQueueStore.getState()
      
      // Add a song to queue first
      addSong(mockSong3)
      
      // Create playlist with songs
      createPlaylist('Load Test', [mockSong1, mockSong2])
      const playlistId = usePlaylistStore.getState().playlists[0].id
      
      loadPlaylistToQueue(playlistId, false)
      
      const queueState = useQueueStore.getState()
      expect(queueState.upcomingSongs).toHaveLength(3)
      expect(queueState.upcomingSongs[0]).toEqual(mockSong3)
      expect(queueState.upcomingSongs[1]).toEqual(mockSong1)
      expect(queueState.upcomingSongs[2]).toEqual(mockSong2)
    })

    it('should load playlist songs to queue (replace mode)', () => {
      const { createPlaylist, loadPlaylistToQueue } = usePlaylistStore.getState()
      const { addSong } = useQueueStore.getState()
      
      // Add a song to queue first
      addSong(mockSong3)
      
      // Create playlist with songs
      createPlaylist('Replace Test', [mockSong1, mockSong2])
      const playlistId = usePlaylistStore.getState().playlists[0].id
      
      loadPlaylistToQueue(playlistId, true)
      
      const queueState = useQueueStore.getState()
      expect(queueState.upcomingSongs).toHaveLength(2)
      expect(queueState.upcomingSongs[0]).toEqual(mockSong1)
      expect(queueState.upcomingSongs[1]).toEqual(mockSong2)
    })

    it('should handle loading non-existent playlist', () => {
      const { addSong } = useQueueStore.getState()
      const { loadPlaylistToQueue } = usePlaylistStore.getState()
      
      // Add a song to queue
      addSong(mockSong1)
      
      loadPlaylistToQueue('non-existent-id', false)
      
      // Queue should remain unchanged
      const queueState = useQueueStore.getState()
      expect(queueState.upcomingSongs).toHaveLength(1)
      expect(queueState.upcomingSongs[0]).toEqual(mockSong1)
    })
  })
})
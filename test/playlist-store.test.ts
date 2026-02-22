import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlaylistStore } from '../src/renderer/store/playlistStore';
import { Song } from '../src/renderer/types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(() => {}),
  removeItem: vi.fn(() => {}),
  clear: vi.fn(() => {}),
  length: 0,
  key: vi.fn(() => null),
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('PlaylistStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    usePlaylistStore.setState({ playlists: [] });
  });

  const mockSong: Song = {
    videoId: 'test123',
    title: 'Test Song',
    channel: 'Test Channel',
    thumbnail: 'https://example.com/thumb.jpg',
    duration: 180,
  };

  const mockSong2: Song = {
    videoId: 'test456',
    title: 'Test Song 2',
    channel: 'Test Channel 2',
    thumbnail: 'https://example.com/thumb2.jpg',
    duration: 240,
  };

  describe('initial state', () => {
    it('should have empty playlists initially', () => {
      const state = usePlaylistStore.getState();
      expect(state.playlists).toEqual([]);
    });
  });

  describe('createPlaylist', () => {
    it('should create a new playlist with correct structure', () => {
      const { createPlaylist } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('My Playlist');
      
      expect(playlist.id).toBeDefined();
      expect(playlist.name).toBe('My Playlist');
      expect(playlist.songs).toEqual([]);
      expect(playlist.createdAt).toBeTypeOf('number');
      expect(playlist.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should add playlist to store', () => {
      const { createPlaylist } = usePlaylistStore.getState();
      
      createPlaylist('My Playlist');
      
      const state = usePlaylistStore.getState();
      expect(state.playlists).toHaveLength(1);
      expect(state.playlists[0].name).toBe('My Playlist');
    });

    it('should create playlist with initial songs', () => {
      const { createPlaylist } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('My Playlist', [mockSong, mockSong2]);
      
      expect(playlist.songs).toHaveLength(2);
      expect(playlist.songs[0]).toEqual(mockSong);
      expect(playlist.songs[1]).toEqual(mockSong2);
    });

    it('should generate unique IDs for playlists', () => {
      const { createPlaylist } = usePlaylistStore.getState();
      
      const playlist1 = createPlaylist('Playlist 1');
      const playlist2 = createPlaylist('Playlist 2');
      
      expect(playlist1.id).not.toBe(playlist2.id);
    });
  });

  describe('deletePlaylist', () => {
    it('should remove playlist by id', () => {
      const { createPlaylist, deletePlaylist } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('Test Playlist');
      deletePlaylist(playlist.id);
      
      const state = usePlaylistStore.getState();
      expect(state.playlists).toHaveLength(0);
    });

    it('should not affect other playlists', () => {
      const { createPlaylist, deletePlaylist } = usePlaylistStore.getState();
      
      const playlist1 = createPlaylist('Playlist 1');
      const playlist2 = createPlaylist('Playlist 2');
      
      deletePlaylist(playlist1.id);
      
      const state = usePlaylistStore.getState();
      expect(state.playlists).toHaveLength(1);
      expect(state.playlists[0].name).toBe('Playlist 2');
    });
  });

  describe('updatePlaylistName', () => {
    it('should rename existing playlist', () => {
      const { createPlaylist, updatePlaylistName } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('Old Name');
      updatePlaylistName(playlist.id, 'New Name');
      
      const state = usePlaylistStore.getState();
      expect(state.playlists[0].name).toBe('New Name');
      expect(state.playlists[0].id).toBe(playlist.id);
    });
  });

  describe('addSongToPlaylist', () => {
    it('should add song to specified playlist', () => {
      const { createPlaylist, addSongToPlaylist } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('My Playlist');
      addSongToPlaylist(playlist.id, mockSong);
      
      const state = usePlaylistStore.getState();
      expect(state.playlists[0].songs).toHaveLength(1);
      expect(state.playlists[0].songs[0]).toEqual(mockSong);
    });

    it('should add multiple songs in order', () => {
      const { createPlaylist, addSongToPlaylist } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('My Playlist');
      addSongToPlaylist(playlist.id, mockSong);
      addSongToPlaylist(playlist.id, mockSong2);
      
      const state = usePlaylistStore.getState();
      expect(state.playlists[0].songs).toHaveLength(2);
      expect(state.playlists[0].songs[0]).toEqual(mockSong);
      expect(state.playlists[0].songs[1]).toEqual(mockSong2);
    });
  });

  describe('removeSongFromPlaylist', () => {
    it('should remove song at specified index', () => {
      const { createPlaylist, addSongToPlaylist, removeSongFromPlaylist } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('My Playlist');
      addSongToPlaylist(playlist.id, mockSong);
      addSongToPlaylist(playlist.id, mockSong2);
      
      removeSongFromPlaylist(playlist.id, 0);
      
      const state = usePlaylistStore.getState();
      expect(state.playlists[0].songs).toHaveLength(1);
      expect(state.playlists[0].songs[0]).toEqual(mockSong2);
    });
  });

  describe('moveSongInPlaylist', () => {
    it('should move song from one position to another', () => {
      const { createPlaylist, addSongToPlaylist, moveSongInPlaylist } = usePlaylistStore.getState();
      
      const song3 = { ...mockSong, videoId: 'test789', title: 'Song 3' };
      const playlist = createPlaylist('My Playlist');
      
      addSongToPlaylist(playlist.id, mockSong);
      addSongToPlaylist(playlist.id, mockSong2);
      addSongToPlaylist(playlist.id, song3);
      
      moveSongInPlaylist(playlist.id, 0, 2); // Move first song to last position
      
      const state = usePlaylistStore.getState();
      expect(state.playlists[0].songs[0]).toEqual(mockSong2);
      expect(state.playlists[0].songs[1]).toEqual(song3);
      expect(state.playlists[0].songs[2]).toEqual(mockSong);
    });
  });

  describe('getPlaylist', () => {
    it('should return playlist by id', () => {
      const { createPlaylist, getPlaylist } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('Test Playlist');
      const found = getPlaylist(playlist.id);
      
      expect(found).toEqual(playlist);
    });

    it('should return undefined for non-existent playlist', () => {
      const { getPlaylist } = usePlaylistStore.getState();
      
      const found = getPlaylist('non-existent');
      
      expect(found).toBeUndefined();
    });
  });

  describe('clearPlaylist', () => {
    it('should clear all songs from playlist', () => {
      const { createPlaylist, addSongToPlaylist, clearPlaylist } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('My Playlist');
      addSongToPlaylist(playlist.id, mockSong);
      addSongToPlaylist(playlist.id, mockSong2);
      
      clearPlaylist(playlist.id);
      
      const state = usePlaylistStore.getState();
      expect(state.playlists[0].songs).toEqual([]);
      expect(state.playlists[0].name).toBe('My Playlist'); // Other properties should remain
    });
  });

  describe('loadPlaylistToQueue', () => {
    it('should call loadPlaylistToQueue without errors', () => {
      const { createPlaylist, addSongToPlaylist, loadPlaylistToQueue } = usePlaylistStore.getState();
      
      const playlist = createPlaylist('My Playlist');
      addSongToPlaylist(playlist.id, mockSong);
      addSongToPlaylist(playlist.id, mockSong2);
      
      // This test just ensures the function can be called without errors
      // The actual queue interaction would need integration testing
      expect(() => {
        loadPlaylistToQueue(playlist.id, false);
      }).not.toThrow();
    });
  });
});
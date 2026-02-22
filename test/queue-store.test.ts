import { describe, it, expect, beforeEach } from 'vitest';
import { useQueueStore } from '../src/renderer/store/queueStore';
import { Song, PlaybackState } from '../src/renderer/types';

describe('QueueStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    useQueueStore.getState().clearQueue();
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
    it('should have correct initial state', () => {
      const state = useQueueStore.getState();
      
      expect(state.currentSong).toBeNull();
      expect(state.upcomingSongs).toEqual([]);
      expect(state.playbackState).toBe(PlaybackState.IDLE);
    });
  });

  describe('addSong', () => {
    it('should add song to upcoming songs', () => {
      const { addSong } = useQueueStore.getState();
      
      addSong(mockSong);
      
      const state = useQueueStore.getState();
      expect(state.upcomingSongs).toHaveLength(1);
      expect(state.upcomingSongs[0]).toEqual(mockSong);
    });

    it('should add multiple songs in order', () => {
      const { addSong } = useQueueStore.getState();
      
      addSong(mockSong);
      addSong(mockSong2);
      
      const state = useQueueStore.getState();
      expect(state.upcomingSongs).toHaveLength(2);
      expect(state.upcomingSongs[0]).toEqual(mockSong);
      expect(state.upcomingSongs[1]).toEqual(mockSong2);
    });
  });

  describe('removeSong', () => {
    it('should remove song at specified index', () => {
      const { addSong, removeSong } = useQueueStore.getState();
      
      addSong(mockSong);
      addSong(mockSong2);
      removeSong(0);
      
      const state = useQueueStore.getState();
      expect(state.upcomingSongs).toHaveLength(1);
      expect(state.upcomingSongs[0]).toEqual(mockSong2);
    });
  });

  describe('clearQueue', () => {
    it('should clear all songs and reset state', () => {
      const { addSong, clearQueue } = useQueueStore.getState();
      
      addSong(mockSong);
      clearQueue();
      
      const state = useQueueStore.getState();
      expect(state.currentSong).toBeNull();
      expect(state.upcomingSongs).toEqual([]);
      expect(state.playbackState).toBe(PlaybackState.IDLE);
    });
  });

  describe('nextSong', () => {
    it('should move first upcoming song to current', () => {
      const { addSong, nextSong } = useQueueStore.getState();
      
      addSong(mockSong);
      addSong(mockSong2);
      nextSong();
      
      const state = useQueueStore.getState();
      expect(state.currentSong).toEqual(mockSong);
      expect(state.upcomingSongs).toHaveLength(1);
      expect(state.upcomingSongs[0]).toEqual(mockSong2);
      expect(state.playbackState).toBe(PlaybackState.LOADING);
    });

    it('should handle empty queue', () => {
      const { nextSong } = useQueueStore.getState();
      
      nextSong();
      
      const state = useQueueStore.getState();
      expect(state.currentSong).toBeNull();
      expect(state.playbackState).toBe(PlaybackState.IDLE);
    });
  });

  describe('setPlaybackState', () => {
    it('should update playback state', () => {
      const { setPlaybackState } = useQueueStore.getState();
      
      setPlaybackState(PlaybackState.PLAYING);
      
      const state = useQueueStore.getState();
      expect(state.playbackState).toBe(PlaybackState.PLAYING);
    });
  });

  describe('reorderQueue', () => {
    it('should reorder songs in queue', () => {
      const { addSong, reorderQueue } = useQueueStore.getState();
      
      addSong(mockSong);
      addSong(mockSong2);
      addSong({ ...mockSong, videoId: 'test789', title: 'Song 3' });
      
      reorderQueue(0, 2); // Move first song to last position
      
      const state = useQueueStore.getState();
      expect(state.upcomingSongs[0]).toEqual(mockSong2);
      expect(state.upcomingSongs[2]).toEqual(mockSong);
    });
  });

  describe('playQueue', () => {
    it('should start playing first song when queue has songs', () => {
      const { addSong, playQueue } = useQueueStore.getState();
      
      addSong(mockSong);
      addSong(mockSong2);
      playQueue();
      
      const state = useQueueStore.getState();
      expect(state.currentSong).toEqual(mockSong);
      expect(state.upcomingSongs).toHaveLength(1);
      expect(state.upcomingSongs[0]).toEqual(mockSong2);
    });

    it('should do nothing when queue is empty', () => {
      const { playQueue } = useQueueStore.getState();
      
      playQueue();
      
      const state = useQueueStore.getState();
      expect(state.currentSong).toBeNull();
      expect(state.upcomingSongs).toEqual([]);
    });
  });
});
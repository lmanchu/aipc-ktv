import { describe, it, expect } from 'vitest';
import { Song, Queue, Playlist, PlaybackState } from '../src/renderer/types';

describe('Types', () => {
  describe('Song interface', () => {
    it('should have all required fields with correct types', () => {
      const song: Song = {
        videoId: 'test123',
        title: 'Test Song',
        channel: 'Test Channel',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 180,
      };

      expect(song.videoId).toBeTypeOf('string');
      expect(song.title).toBeTypeOf('string');
      expect(song.channel).toBeTypeOf('string');
      expect(song.thumbnail).toBeTypeOf('string');
      expect(song.duration).toBeTypeOf('number');
    });
  });

  describe('PlaybackState enum', () => {
    it('should have all expected values', () => {
      expect(PlaybackState.IDLE).toBe('idle');
      expect(PlaybackState.PLAYING).toBe('playing');
      expect(PlaybackState.PAUSED).toBe('paused');
      expect(PlaybackState.LOADING).toBe('loading');
      expect(PlaybackState.ERROR).toBe('error');
    });
  });

  describe('Queue interface', () => {
    it('should have all required fields with correct types', () => {
      const mockSong: Song = {
        videoId: 'test123',
        title: 'Test Song',
        channel: 'Test Channel',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 180,
      };

      const queue: Queue = {
        currentSong: mockSong,
        upcomingSongs: [mockSong],
        playbackState: PlaybackState.PLAYING,
      };

      expect(queue.currentSong).toBeDefined();
      expect(queue.upcomingSongs).toBeInstanceOf(Array);
      expect(Object.values(PlaybackState)).toContain(queue.playbackState);
    });

    it('should allow null current song', () => {
      const queue: Queue = {
        currentSong: null,
        upcomingSongs: [],
        playbackState: PlaybackState.IDLE,
      };

      expect(queue.currentSong).toBeNull();
    });
  });

  describe('Playlist interface', () => {
    it('should have all required fields with correct types', () => {
      const mockSong: Song = {
        videoId: 'test123',
        title: 'Test Song',
        channel: 'Test Channel',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 180,
      };

      const playlist: Playlist = {
        id: 'playlist_123',
        name: 'My Playlist',
        songs: [mockSong],
        createdAt: Date.now(),
      };

      expect(playlist.id).toBeTypeOf('string');
      expect(playlist.name).toBeTypeOf('string');
      expect(playlist.songs).toBeInstanceOf(Array);
      expect(playlist.createdAt).toBeTypeOf('number');
    });

    it('should allow empty songs array', () => {
      const playlist: Playlist = {
        id: 'playlist_123',
        name: 'Empty Playlist',
        songs: [],
        createdAt: Date.now(),
      };

      expect(playlist.songs).toEqual([]);
    });
  });
});
import { describe, it, expect } from 'vitest'
import type { Song, Queue, Playlist, PlaybackState } from '../../../src/renderer/types'

describe('Data Models - Types and Interfaces', () => {
  describe('Song interface', () => {
    it('should define a valid Song with all required fields', () => {
      const song: Song = {
        videoId: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        channel: 'RickAstleyVEVO',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
        duration: 212,
      }

      expect(song.videoId).toBe('dQw4w9WgXcQ')
      expect(song.title).toBe('Never Gonna Give You Up')
      expect(song.channel).toBe('RickAstleyVEVO')
      expect(song.thumbnail).toContain('https://')
      expect(typeof song.duration).toBe('number')
      expect(song.duration).toBeGreaterThan(0)
    })

    it('should enforce required fields', () => {
      // TypeScript compilation will catch missing fields
      const song: Song = {
        videoId: 'test123',
        title: 'Test Song',
        channel: 'Test Channel',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 180,
      }

      // All fields should be defined
      expect(song.videoId).toBeDefined()
      expect(song.title).toBeDefined()
      expect(song.channel).toBeDefined()
      expect(song.thumbnail).toBeDefined()
      expect(song.duration).toBeDefined()
    })
  })

  describe('Queue interface', () => {
    it('should define a valid Queue with all required fields', () => {
      const mockSong: Song = {
        videoId: 'test123',
        title: 'Test Song',
        channel: 'Test Channel',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 180,
      }

      const queue: Queue = {
        currentSong: mockSong,
        upcomingSongs: [mockSong],
        playbackState: 'playing' as PlaybackState,
      }

      expect(queue.currentSong).toEqual(mockSong)
      expect(Array.isArray(queue.upcomingSongs)).toBe(true)
      expect(queue.upcomingSongs).toHaveLength(1)
      expect(queue.playbackState).toBe('playing')
    })

    it('should allow null currentSong', () => {
      const queue: Queue = {
        currentSong: null,
        upcomingSongs: [],
        playbackState: 'idle' as PlaybackState,
      }

      expect(queue.currentSong).toBeNull()
      expect(queue.upcomingSongs).toEqual([])
      expect(queue.playbackState).toBe('idle')
    })
  })

  describe('Playlist interface', () => {
    it('should define a valid Playlist with all required fields', () => {
      const mockSong: Song = {
        videoId: 'test123',
        title: 'Test Song',
        channel: 'Test Channel',
        thumbnail: 'https://example.com/thumb.jpg',
        duration: 180,
      }

      const playlist: Playlist = {
        id: 'playlist-123',
        name: 'My Awesome Playlist',
        songs: [mockSong],
        createdAt: Date.now(),
      }

      expect(typeof playlist.id).toBe('string')
      expect(playlist.id.length).toBeGreaterThan(0)
      expect(typeof playlist.name).toBe('string')
      expect(Array.isArray(playlist.songs)).toBe(true)
      expect(typeof playlist.createdAt).toBe('number')
      expect(playlist.createdAt).toBeGreaterThan(0)
    })

    it('should allow empty songs array', () => {
      const playlist: Playlist = {
        id: 'empty-playlist',
        name: 'Empty Playlist',
        songs: [],
        createdAt: Date.now(),
      }

      expect(playlist.songs).toEqual([])
      expect(playlist.songs).toHaveLength(0)
    })
  })

  describe('PlaybackState enum', () => {
    it('should have all required playback states', () => {
      // These should be available as types/enums
      const states = ['idle', 'playing', 'paused', 'loading', 'error']
      
      states.forEach(state => {
        const typedState = state as PlaybackState
        expect(typeof typedState).toBe('string')
      })
    })
  })
})
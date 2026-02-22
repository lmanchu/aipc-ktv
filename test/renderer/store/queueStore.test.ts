import { describe, it, expect, beforeEach } from 'vitest'
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

describe('Queue Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useQueueStore.getState().clearQueue()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useQueueStore.getState()
      
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
      expect(state.playbackState).toBe('idle')
    })
  })

  describe('addSong action', () => {
    it('should add a song to the queue', () => {
      const { addSong } = useQueueStore.getState()
      
      addSong(mockSong1)
      
      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(1)
      expect(state.upcomingSongs[0]).toEqual(mockSong1)
    })

    it('should add multiple songs in order', () => {
      const { addSong } = useQueueStore.getState()
      
      addSong(mockSong1)
      addSong(mockSong2)
      addSong(mockSong3)
      
      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(3)
      expect(state.upcomingSongs[0]).toEqual(mockSong1)
      expect(state.upcomingSongs[1]).toEqual(mockSong2)
      expect(state.upcomingSongs[2]).toEqual(mockSong3)
    })
  })

  describe('removeSong action', () => {
    it('should remove a song from the queue by index', () => {
      const { addSong, removeSong } = useQueueStore.getState()
      
      addSong(mockSong1)
      addSong(mockSong2)
      addSong(mockSong3)
      
      removeSong(1) // Remove middle song
      
      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(2)
      expect(state.upcomingSongs[0]).toEqual(mockSong1)
      expect(state.upcomingSongs[1]).toEqual(mockSong3)
    })

    it('should handle removing first song', () => {
      const { addSong, removeSong } = useQueueStore.getState()
      
      addSong(mockSong1)
      addSong(mockSong2)
      
      removeSong(0)
      
      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(1)
      expect(state.upcomingSongs[0]).toEqual(mockSong2)
    })

    it('should handle removing last song', () => {
      const { addSong, removeSong } = useQueueStore.getState()
      
      addSong(mockSong1)
      addSong(mockSong2)
      
      removeSong(1)
      
      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(1)
      expect(state.upcomingSongs[0]).toEqual(mockSong1)
    })
  })

  describe('nextSong action', () => {
    it('should move first song from upcoming to current', () => {
      const { addSong, nextSong } = useQueueStore.getState()
      
      addSong(mockSong1)
      addSong(mockSong2)
      
      nextSong()
      
      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong1)
      expect(state.upcomingSongs).toHaveLength(1)
      expect(state.upcomingSongs[0]).toEqual(mockSong2)
      expect(state.playbackState).toBe('loading')
    })

    it('should handle empty queue', () => {
      const { nextSong } = useQueueStore.getState()
      
      nextSong()
      
      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
      expect(state.playbackState).toBe('idle')
    })

    it('should handle queue with only one song', () => {
      const { addSong, nextSong } = useQueueStore.getState()
      
      addSong(mockSong1)
      nextSong()
      
      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong1)
      expect(state.upcomingSongs).toEqual([])
      expect(state.playbackState).toBe('loading')
    })
  })

  describe('clearQueue action', () => {
    it('should clear entire queue and reset state', () => {
      const { addSong, nextSong, clearQueue } = useQueueStore.getState()
      
      // Set up some state
      addSong(mockSong1)
      addSong(mockSong2)
      nextSong()
      
      clearQueue()
      
      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
      expect(state.playbackState).toBe('idle')
    })
  })

  describe('reorderQueue action', () => {
    it('should move song from one position to another', () => {
      const { addSong, reorderQueue } = useQueueStore.getState()
      
      addSong(mockSong1)
      addSong(mockSong2)
      addSong(mockSong3)
      
      // Move first song to last position
      reorderQueue(0, 2)
      
      const state = useQueueStore.getState()
      expect(state.upcomingSongs[0]).toEqual(mockSong2)
      expect(state.upcomingSongs[1]).toEqual(mockSong3)
      expect(state.upcomingSongs[2]).toEqual(mockSong1)
    })

    it('should move song backwards in queue', () => {
      const { addSong, reorderQueue } = useQueueStore.getState()
      
      addSong(mockSong1)
      addSong(mockSong2)
      addSong(mockSong3)
      
      // Move last song to first position
      reorderQueue(2, 0)
      
      const state = useQueueStore.getState()
      expect(state.upcomingSongs[0]).toEqual(mockSong3)
      expect(state.upcomingSongs[1]).toEqual(mockSong1)
      expect(state.upcomingSongs[2]).toEqual(mockSong2)
    })
  })

  describe('setPlaybackState action', () => {
    it('should update playback state', () => {
      const { setPlaybackState } = useQueueStore.getState()
      
      setPlaybackState('playing')
      expect(useQueueStore.getState().playbackState).toBe('playing')
      
      setPlaybackState('paused')
      expect(useQueueStore.getState().playbackState).toBe('paused')
      
      setPlaybackState('error')
      expect(useQueueStore.getState().playbackState).toBe('error')
    })
  })

  describe('playQueue action', () => {
    it('should start playing if queue has songs and no current song', () => {
      const { addSong, playQueue } = useQueueStore.getState()
      
      addSong(mockSong1)
      addSong(mockSong2)
      
      playQueue()
      
      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong1)
      expect(state.upcomingSongs).toHaveLength(1)
      expect(state.playbackState).toBe('loading')
    })

    it('should do nothing if queue is empty', () => {
      const { playQueue } = useQueueStore.getState()
      
      playQueue()
      
      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
      expect(state.playbackState).toBe('idle')
    })

    it('should do nothing if already has current song', () => {
      const { addSong, nextSong, playQueue } = useQueueStore.getState()
      
      addSong(mockSong1)
      addSong(mockSong2)
      nextSong()
      
      const stateBefore = useQueueStore.getState()
      
      playQueue()
      
      const stateAfter = useQueueStore.getState()
      expect(stateAfter).toEqual(stateBefore)
    })
  })
})
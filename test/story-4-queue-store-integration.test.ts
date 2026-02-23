import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useQueueStore } from '../src/renderer/store/queueStore'
import { usePreferenceStore } from '../src/renderer/store/preferenceStore'
import { QueueStorageService } from '../src/renderer/services/queueStorage'
import type { Song, Queue } from '../src/renderer/types'
import { PlaybackState } from '../src/renderer/types'

describe('QueueStore Integration with Persistence', () => {
  let mockStorage: any
  const mockSong: Song = {
    videoId: 'test123',
    title: 'Test Song',
    channel: 'Test Channel',
    thumbnail: 'https://example.com/thumb.jpg',
    duration: 180,
  }

  const mockSong2: Song = {
    videoId: 'test456',
    title: 'Test Song 2',
    channel: 'Test Channel 2',
    thumbnail: 'https://example.com/thumb2.jpg',
    duration: 240,
  }

  beforeEach(() => {
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

    QueueStorageService.resetInstance()
    usePreferenceStore.setState({ persistQueue: false })

    useQueueStore.setState({
      currentSong: null,
      upcomingSongs: [],
      playbackState: PlaybackState.IDLE,
    })
  })

  describe('initialize()', () => {
    it('should load queue from file when persistence is enabled', async () => {
      const savedQueue: Queue = {
        currentSong: mockSong,
        upcomingSongs: [mockSong2],
        playbackState: PlaybackState.PLAYING,
      }

      mockStorage.read.mockResolvedValue({
        success: true,
        data: savedQueue,
      })

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong)
      expect(state.upcomingSongs).toEqual([mockSong2])
      expect(state.playbackState).toBe(PlaybackState.PLAYING)
    })

    it('should not load queue when persistence is disabled', async () => {
      mockStorage.read.mockResolvedValue({
        success: true,
        data: null,
      })

      await useQueueStore.getState().initialize()

      expect(mockStorage.read).not.toHaveBeenCalled()
    })

    it('should handle load errors gracefully', async () => {
      mockStorage.read.mockRejectedValue(new Error('Load failed'))

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
    })

    it('should handle null queue data', async () => {
      mockStorage.read.mockResolvedValue({
        success: true,
        data: null,
      })

      usePreferenceStore.setState({ persistQueue: true })
      await useQueueStore.getState().initialize()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
    })
  })

  describe('addSong()', () => {
    it('should add song and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)

      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(1)
      expect(state.upcomingSongs[0]).toEqual(mockSong)
      expect(mockStorage.write).toHaveBeenCalled()
    })

    it('should add song without saving when persistence is disabled', async () => {
      usePreferenceStore.setState({ persistQueue: false })

      await useQueueStore.getState().addSong(mockSong)

      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(1)
      expect(mockStorage.write).not.toHaveBeenCalled()
    })

    it('should add multiple songs in order', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().addSong(mockSong2)

      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(2)
      expect(state.upcomingSongs[0]).toEqual(mockSong)
      expect(state.upcomingSongs[1]).toEqual(mockSong2)
    })
  })

  describe('removeSong()', () => {
    it('should remove song and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().addSong(mockSong2)
      await useQueueStore.getState().removeSong(0)

      const state = useQueueStore.getState()
      expect(state.upcomingSongs).toHaveLength(1)
      expect(state.upcomingSongs[0]).toEqual(mockSong2)
      expect(mockStorage.write).toHaveBeenCalled()
    })
  })

  describe('nextSong()', () => {
    it('should advance queue and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().addSong(mockSong2)
      await useQueueStore.getState().nextSong()

      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong)
      expect(state.upcomingSongs).toHaveLength(1)
      expect(state.playbackState).toBe(PlaybackState.LOADING)
      expect(mockStorage.write).toHaveBeenCalled()
    })

    it('should handle empty queue gracefully', async () => {
      usePreferenceStore.setState({ persistQueue: true })
      mockStorage.write.mockResolvedValue({ success: true })

      await useQueueStore.getState().nextSong()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.playbackState).toBe(PlaybackState.IDLE)
    })
  })

  describe('clearQueue()', () => {
    it('should clear queue and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().clearQueue()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.upcomingSongs).toEqual([])
      expect(state.playbackState).toBe(PlaybackState.IDLE)
      expect(mockStorage.write).toHaveBeenCalled()
    })
  })

  describe('reorderQueue()', () => {
    it('should reorder queue and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().addSong(mockSong2)
      await useQueueStore.getState().addSong({ ...mockSong, videoId: 'test789', title: 'Song 3' })

      await useQueueStore.getState().reorderQueue(0, 2)

      const state = useQueueStore.getState()
      expect(state.upcomingSongs[0]).toEqual(mockSong2)
      expect(state.upcomingSongs[2]).toEqual(mockSong)
      expect(mockStorage.write).toHaveBeenCalled()
    })
  })

  describe('shuffleQueue()', () => {
    it('should shuffle queue and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().addSong(mockSong2)
      await useQueueStore.getState().addSong({ ...mockSong, videoId: 'test789', title: 'Song 3' })

      const stateBefore = useQueueStore.getState().upcomingSongs
      await useQueueStore.getState().shuffleQueue()

      const stateAfter = useQueueStore.getState().upcomingSongs
      expect(stateAfter).toHaveLength(3)
      expect(mockStorage.write).toHaveBeenCalled()
    })
  })

  describe('setCurrentSong()', () => {
    it('should set current song and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().setCurrentSong(mockSong)

      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong)
      expect(state.playbackState).toBe(PlaybackState.LOADING)
      expect(mockStorage.write).toHaveBeenCalled()
    })

    it('should clear current song and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().setCurrentSong(null)

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
      expect(state.playbackState).toBe(PlaybackState.IDLE)
      expect(mockStorage.write).toHaveBeenCalled()
    })
  })

  describe('setPlaybackState()', () => {
    it('should set playback state and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().setPlaybackState(PlaybackState.PLAYING)

      const state = useQueueStore.getState()
      expect(state.playbackState).toBe(PlaybackState.PLAYING)
      expect(mockStorage.write).toHaveBeenCalled()
    })
  })

  describe('moveInQueue()', () => {
    it('should move song in queue and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().addSong(mockSong2)
      await useQueueStore.getState().addSong({ ...mockSong, videoId: 'test789', title: 'Song 3' })

      await useQueueStore.getState().moveInQueue(0, 2)

      const state = useQueueStore.getState()
      expect(state.upcomingSongs[0]).toEqual(mockSong2)
      expect(state.upcomingSongs[2]).toEqual(mockSong)
      expect(mockStorage.write).toHaveBeenCalled()
    })
  })

  describe('playNext()', () => {
    it('should call nextSong and save to file when persistence is enabled', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      await useQueueStore.getState().playNext()

      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong)
      expect(mockStorage.write).toHaveBeenCalled()
    })
  })

  describe('playQueue()', () => {
    it('should start playing first song when queue has songs (sync method)', async () => {
      mockStorage.write.mockResolvedValue({ success: true })
      usePreferenceStore.setState({ persistQueue: true })

      await useQueueStore.getState().addSong(mockSong)
      useQueueStore.getState().playQueue()

      const state = useQueueStore.getState()
      expect(state.currentSong).toEqual(mockSong)
    })

    it('should do nothing when queue is empty (sync method)', () => {
      useQueueStore.getState().playQueue()

      const state = useQueueStore.getState()
      expect(state.currentSong).toBeNull()
    })
  })
})

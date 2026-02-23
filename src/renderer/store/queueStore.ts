import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Song, Queue } from '../types'
import { PlaybackState } from '../types'
import { QueueStorageService } from '../services/queueStorage'
import { usePreferenceStore } from './preferenceStore'

interface QueueActions {
  addSong: (song: Song) => Promise<void>
  removeSong: (index: number) => Promise<void>
  nextSong: () => Promise<void>
  clearQueue: () => Promise<void>
  reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>
  setPlaybackState: (state: PlaybackState) => Promise<void>
  playQueue: () => void
  playNext: () => Promise<void>
  setCurrentSong: (song: Song | null) => Promise<void>
  shuffleQueue: () => Promise<void>
  moveInQueue: (fromIndex: number, toIndex: number) => Promise<void>
  initialize: () => Promise<void>
}

interface QueueStore extends Queue, QueueActions {}

const saveQueue = async (queue: Queue): Promise<void> => {
  const persistEnabled = usePreferenceStore.getState().persistQueue
  if (!persistEnabled) {
    return
  }

  try {
    const storageService = QueueStorageService.getInstance()
    const success = await storageService.save(queue)
    if (!success) {
      console.error('Failed to save queue to file')
    }
  } catch (error) {
    console.error('Error saving queue:', error)
  }
}

export const useQueueStore = create<QueueStore>()(
  devtools(
    (set, get) => ({
      currentSong: null,
      upcomingSongs: [],
      playbackState: PlaybackState.IDLE,

      initialize: async () => {
        try {
          const persistEnabled = usePreferenceStore.getState().persistQueue
          if (!persistEnabled) {
            return
          }

          const storageService = QueueStorageService.getInstance()
          const queue = await storageService.load()
          if (queue) {
            set({
              currentSong: queue.currentSong || null,
              upcomingSongs: queue.upcomingSongs || [],
              playbackState: queue.playbackState || PlaybackState.IDLE,
            }, false, 'initialize')
          }
        } catch (error) {
          console.error('Error initializing queue:', error)
        }
      },

      addSong: async (song: Song) => {
        set(
          (state) => ({
            upcomingSongs: [...state.upcomingSongs, song],
          }),
          false,
          'addSong'
        )
        await saveQueue(get())
      },

      removeSong: async (index: number) => {
        set(
          (state) => {
            const newUpcomingSongs = [...state.upcomingSongs]
            newUpcomingSongs.splice(index, 1)
            return { upcomingSongs: newUpcomingSongs }
          },
          false,
          'removeSong'
        )
        await saveQueue(get())
      },

      nextSong: async () => {
        set(
          (state) => {
            if (state.upcomingSongs.length === 0) {
              return {
                currentSong: null,
                playbackState: PlaybackState.IDLE,
              }
            }

            const [nextSong, ...remainingSongs] = state.upcomingSongs
            return {
              currentSong: nextSong,
              upcomingSongs: remainingSongs,
              playbackState: PlaybackState.LOADING,
            }
          },
          false,
          'nextSong'
        )
        await saveQueue(get())
      },

      clearQueue: async () => {
        set(
          {
            currentSong: null,
            upcomingSongs: [],
            playbackState: PlaybackState.IDLE,
          },
          false,
          'clearQueue'
        )
        await saveQueue(get())
      },

      reorderQueue: async (fromIndex: number, toIndex: number) => {
        set(
          (state) => {
            const newUpcomingSongs = [...state.upcomingSongs]
            const [movedSong] = newUpcomingSongs.splice(fromIndex, 1)
            newUpcomingSongs.splice(toIndex, 0, movedSong)
            return { upcomingSongs: newUpcomingSongs }
          },
          false,
          'reorderQueue'
        )
        await saveQueue(get())
      },

      setPlaybackState: async (playbackState: PlaybackState) => {
        set(
          { playbackState },
          false,
          'setPlaybackState'
        )
        await saveQueue(get())
      },

      playQueue: () => {
        const state = get()
        if (state.upcomingSongs.length > 0 && !state.currentSong) {
          state.nextSong()
        }
      },

      playNext: async () => {
        await get().nextSong()
      },

      setCurrentSong: async (song: Song | null) => {
        set(
          {
            currentSong: song,
            playbackState: song ? PlaybackState.LOADING : PlaybackState.IDLE,
          },
          false,
          'setCurrentSong'
        )
        await saveQueue(get())
      },

      shuffleQueue: async () => {
        set(
          (state) => {
            const shuffled = [...state.upcomingSongs]
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            return { upcomingSongs: shuffled }
          },
          false,
          'shuffleQueue'
        )
        await saveQueue(get())
      },

      moveInQueue: async (fromIndex: number, toIndex: number) => {
        await get().reorderQueue(fromIndex, toIndex)
      },
    }),
    {
      name: 'queue-store',
    }
  )
)

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Song, Queue } from '../types'
import { PlaybackState } from '../types'

interface QueueActions {
  addSong: (song: Song) => void
  removeSong: (index: number) => void
  nextSong: () => void
  clearQueue: () => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  setPlaybackState: (state: PlaybackState) => void
  playQueue: () => void
  playNext: () => void
  setCurrentSong: (song: Song | null) => void
  shuffleQueue: () => void
  moveInQueue: (fromIndex: number, toIndex: number) => void
}

interface QueueStore extends Queue, QueueActions {}

export const useQueueStore = create<QueueStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSong: null,
      upcomingSongs: [],
      playbackState: PlaybackState.IDLE,

      // Actions
      addSong: (song: Song) =>
        set(
          (state) => ({
            upcomingSongs: [...state.upcomingSongs, song],
          }),
          false,
          'addSong'
        ),

      removeSong: (index: number) =>
        set(
          (state) => {
            const newUpcomingSongs = [...state.upcomingSongs]
            newUpcomingSongs.splice(index, 1)
            return { upcomingSongs: newUpcomingSongs }
          },
          false,
          'removeSong'
        ),

      nextSong: () =>
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
        ),

      clearQueue: () =>
        set(
          {
            currentSong: null,
            upcomingSongs: [],
            playbackState: PlaybackState.IDLE,
          },
          false,
          'clearQueue'
        ),

      reorderQueue: (fromIndex: number, toIndex: number) =>
        set(
          (state) => {
            const newUpcomingSongs = [...state.upcomingSongs]
            const [movedSong] = newUpcomingSongs.splice(fromIndex, 1)
            newUpcomingSongs.splice(toIndex, 0, movedSong)
            return { upcomingSongs: newUpcomingSongs }
          },
          false,
          'reorderQueue'
        ),

      setPlaybackState: (playbackState: PlaybackState) =>
        set(
          { playbackState },
          false,
          'setPlaybackState'
        ),

      playQueue: () => {
        const state = get()
        if (state.upcomingSongs.length > 0 && !state.currentSong) {
          state.nextSong()
        }
      },

      // Additional methods expected by tests
      playNext: () => {
        // Alias for nextSong for backward compatibility
        const state = get()
        state.nextSong()
      },

      setCurrentSong: (song: Song | null) =>
        set(
          {
            currentSong: song,
            playbackState: song ? PlaybackState.LOADING : PlaybackState.IDLE,
          },
          false,
          'setCurrentSong'
        ),

      shuffleQueue: () =>
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
        ),

      moveInQueue: (fromIndex: number, toIndex: number) => {
        // Alias for reorderQueue for backward compatibility
        const state = get()
        state.reorderQueue(fromIndex, toIndex)
      },
    }),
    {
      name: 'queue-store',
    }
  )
)
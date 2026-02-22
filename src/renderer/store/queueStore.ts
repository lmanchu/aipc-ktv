import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Song, Queue } from '../types'
import { PlaybackState } from '../types'

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
            ...state,
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
            return { ...state, upcomingSongs: newUpcomingSongs }
          },
          false,
          'removeSong'
        ),

      nextSong: () =>
        set(
          (state) => {
            if (state.upcomingSongs.length === 0) {
              return {
                ...state,
                currentSong: null,
                playbackState: PlaybackState.IDLE,
              }
            }

            const [nextSong, ...remainingSongs] = state.upcomingSongs
            return {
              ...state,
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
          (state) => ({
            ...state,
            currentSong: null,
            upcomingSongs: [],
            playbackState: PlaybackState.IDLE,
          }),
          false,
          'clearQueue'
        ),

      reorderQueue: (fromIndex: number, toIndex: number) =>
        set(
          (state) => {
            const newUpcomingSongs = [...state.upcomingSongs]
            const [movedSong] = newUpcomingSongs.splice(fromIndex, 1)
            newUpcomingSongs.splice(toIndex, 0, movedSong)
            return { ...state, upcomingSongs: newUpcomingSongs }
          },
          false,
          'reorderQueue'
        ),

      setPlaybackState: (playbackState: PlaybackState) =>
        set(
          (state) => ({ ...state, playbackState }),
          false,
          'setPlaybackState'
        ),

      playQueue: () => {
        const state = get()
        if (state.upcomingSongs.length > 0 && !state.currentSong) {
          state.nextSong()
        }
      },
    }),
    {
      name: 'queue-store',
    }
  )
)
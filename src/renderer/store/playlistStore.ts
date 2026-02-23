import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Song, Playlist } from '../types'
import { useQueueStore } from './queueStore'
import { playlistStorageService } from '../services/playlistStorage'

interface PlaylistActions {
  createPlaylist: (name: string, songs?: Song[]) => Promise<Playlist>
  deletePlaylist: (id: string) => Promise<void>
  addSongToPlaylist: (playlistId: string, song: Song) => Promise<void>
  removeSongFromPlaylist: (playlistId: string, songIndex: number) => Promise<void>
  loadPlaylistToQueue: (playlistId: string, replace?: boolean) => void
  updatePlaylistName: (id: string, name: string) => Promise<void>
  renamePlaylist: (id: string, name: string) => Promise<void>
  moveSongInPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => Promise<void>
  getPlaylist: (id: string) => Playlist | undefined
  clearPlaylist: (id: string) => Promise<void>
  initialize: () => Promise<void>
}

interface PlaylistStore {
  playlists: Playlist[]
}

interface PlaylistStoreWithActions extends PlaylistStore, PlaylistActions {}

const savePlaylists = async (playlists: Playlist[]): Promise<boolean> => {
  try {
    const success = await playlistStorageService.save(playlists)
    if (!success) {
      console.error('Failed to save playlists to file')
    }
    return success
  } catch (error) {
    console.error('Error saving playlists:', error)
    return false
  }
}

export const usePlaylistStore = create<PlaylistStoreWithActions>()(
  devtools(
    (set, get) => ({
      playlists: [],

      initialize: async () => {
        try {
          const playlists = await playlistStorageService.load()
          set({ playlists }, false, 'initialize')
        } catch (error) {
          console.error('Error initializing playlists:', error)
          set({ playlists: [] }, false, 'initialize')
        }
      },

      createPlaylist: async (name: string, songs: Song[] = []) => {
        const newPlaylist: Playlist = {
          id: generateId(),
          name,
          songs,
          createdAt: Date.now(),
        }
        set(
          (state) => ({ playlists: [...state.playlists, newPlaylist] }),
          false,
          'createPlaylist'
        )
        await savePlaylists(get().playlists)
        return newPlaylist
      },

      deletePlaylist: async (id: string) => {
        set(
          (state) => ({
            playlists: state.playlists.filter((playlist) => playlist.id !== id),
          }),
          false,
          'deletePlaylist'
        )
        await savePlaylists(get().playlists)
      },

      addSongToPlaylist: async (playlistId: string, song: Song) => {
        set(
          (state) => ({
            playlists: state.playlists.map((playlist) =>
              playlist.id === playlistId
                ? { ...playlist, songs: [...playlist.songs, song] }
                : playlist
            ),
          }),
          false,
          'addSongToPlaylist'
        )
        await savePlaylists(get().playlists)
      },

      removeSongFromPlaylist: async (playlistId: string, songIndex: number) => {
        set(
          (state) => ({
            playlists: state.playlists.map((playlist) =>
              playlist.id === playlistId
                ? {
                    ...playlist,
                    songs: playlist.songs.filter((_, index) => index !== songIndex),
                  }
                : playlist
            ),
          }),
          false,
          'removeSongFromPlaylist'
        )
        await savePlaylists(get().playlists)
      },

      loadPlaylistToQueue: (playlistId: string, replace: boolean = false) => {
        const state = get()
        const playlist = state.playlists.find((p) => p.id === playlistId)
        if (!playlist) return

        const queueStore = useQueueStore.getState()
        
        if (replace) {
          queueStore.clearQueue()
        }

        playlist.songs.forEach((song) => {
          queueStore.addSong(song)
        })
      },

      updatePlaylistName: async (id: string, name: string) => {
        set(
          (state) => ({
            playlists: state.playlists.map((playlist) =>
              playlist.id === id ? { ...playlist, name } : playlist
            ),
          }),
          false,
          'updatePlaylistName'
        )
        await savePlaylists(get().playlists)
      },

      renamePlaylist: async (id: string, name: string) => {
        const state = get()
        await state.updatePlaylistName(id, name)
      },

      moveSongInPlaylist: async (playlistId: string, fromIndex: number, toIndex: number) => {
        set(
          (state) => ({
            playlists: state.playlists.map((playlist) => {
              if (playlist.id !== playlistId) return playlist
              
              const newSongs = [...playlist.songs]
              const [movedSong] = newSongs.splice(fromIndex, 1)
              newSongs.splice(toIndex, 0, movedSong)
              
              return { ...playlist, songs: newSongs }
            }),
          }),
          false,
          'moveSongInPlaylist'
        )
        await savePlaylists(get().playlists)
      },

      getPlaylist: (id: string) => {
        const state = get()
        return state.playlists.find((playlist) => playlist.id === id)
      },

      clearPlaylist: async (id: string) => {
        set(
          (state) => ({
            playlists: state.playlists.map((playlist) =>
              playlist.id === id ? { ...playlist, songs: [] } : playlist
            ),
          }),
          false,
          'clearPlaylist'
        )
        await savePlaylists(get().playlists)
      },
    }),
    {
      name: 'playlist-store',
    }
  )
)

/** Generate unique ID for playlists */
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}
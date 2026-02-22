import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Song, Playlist } from '../types'
import { useQueueStore } from './queueStore'

interface PlaylistActions {
  createPlaylist: (name: string, songs?: Song[]) => Playlist
  deletePlaylist: (id: string) => void
  addSongToPlaylist: (playlistId: string, song: Song) => void
  removeSongFromPlaylist: (playlistId: string, songIndex: number) => void
  loadPlaylistToQueue: (playlistId: string, replace?: boolean) => void
  updatePlaylistName: (id: string, name: string) => void
  renamePlaylist: (id: string, name: string) => void
  moveSongInPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => void
  getPlaylist: (id: string) => Playlist | undefined
  clearPlaylist: (id: string) => void
}

interface PlaylistStore {
  playlists: Playlist[]
}

interface PlaylistStoreWithActions extends PlaylistStore, PlaylistActions {}

export const usePlaylistStore = create<PlaylistStoreWithActions>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        playlists: [],

        // Actions
        createPlaylist: (name: string, songs: Song[] = []) => {
          const newPlaylist: Playlist = {
            id: generateId(),
            name,
            songs,
            createdAt: Date.now(),
          }
          set(
            (state) => ({
              playlists: [...state.playlists, newPlaylist],
            }),
            false,
            'createPlaylist'
          )
          return newPlaylist
        },

        deletePlaylist: (id: string) =>
          set(
            (state) => ({
              playlists: state.playlists.filter((playlist) => playlist.id !== id),
            }),
            false,
            'deletePlaylist'
          ),

        addSongToPlaylist: (playlistId: string, song: Song) =>
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
          ),

        removeSongFromPlaylist: (playlistId: string, songIndex: number) =>
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
          ),

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

        updatePlaylistName: (id: string, name: string) =>
          set(
            (state) => ({
              playlists: state.playlists.map((playlist) =>
                playlist.id === id ? { ...playlist, name } : playlist
              ),
            }),
            false,
            'updatePlaylistName'
          ),

        renamePlaylist: (id: string, name: string) => {
          // Alias for updatePlaylistName for backward compatibility
          const state = get()
          state.updatePlaylistName(id, name)
        },

        moveSongInPlaylist: (playlistId: string, fromIndex: number, toIndex: number) =>
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
          ),

        getPlaylist: (id: string) => {
          const state = get()
          return state.playlists.find((playlist) => playlist.id === id)
        },

        clearPlaylist: (id: string) =>
          set(
            (state) => ({
              playlists: state.playlists.map((playlist) =>
                playlist.id === id ? { ...playlist, songs: [] } : playlist
              ),
            }),
            false,
            'clearPlaylist'
          ),
      }),
      {
        name: 'playlist-store',
        // Only persist the playlists data, not actions
        partialize: (state) => ({ playlists: state.playlists }),
      }
    ),
    {
      name: 'playlist-store',
    }
  )
)

/** Generate unique ID for playlists */
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}
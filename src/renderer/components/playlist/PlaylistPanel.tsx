import React, { useState } from 'react'
import { usePlaylistStore } from '../../store'
import { useQueueStore } from '../../store'
import type { Playlist } from '../../types'

interface PlaylistPanelProps {
  className?: string
}

export default function PlaylistPanel({ className = '' }: PlaylistPanelProps) {
  const { playlists, createPlaylist, deletePlaylist, loadPlaylistToQueue } = usePlaylistStore()
  const { upcomingSongs, currentSong } = useQueueStore()
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleCreate = () => {
    const name = newPlaylistName.trim()
    if (!name) return
    createPlaylist(name)
    setNewPlaylistName('')
  }

  const handleSaveCurrentQueue = () => {
    const songs = currentSong ? [currentSong, ...upcomingSongs] : [...upcomingSongs]
    if (songs.length === 0) return
    const name = `Playlist ${new Date().toLocaleDateString()}`
    createPlaylist(name, songs)
  }

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString()

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Playlists</h2>
        <p className="text-sm text-gray-600">Save and load song collections</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New playlist name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={!newPlaylistName.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Create
        </button>
      </div>

      {(currentSong || upcomingSongs.length > 0) && (
        <button
          onClick={handleSaveCurrentQueue}
          className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
        >
          Save Current Queue as Playlist ({(currentSong ? 1 : 0) + upcomingSongs.length} songs)
        </button>
      )}

      {playlists.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No playlists yet. Create one or save the current queue.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {playlists.map((playlist: Playlist) => (
            <div
              key={playlist.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedId(expandedId === playlist.id ? null : playlist.id)}
              >
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">{playlist.name}</h4>
                  <p className="text-xs text-gray-500">
                    {playlist.songs.length} songs &middot; {formatDate(playlist.createdAt)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      loadPlaylistToQueue(playlist.id, true)
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Load
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      loadPlaylistToQueue(playlist.id, false)
                    }}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Append
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePlaylist(playlist.id)
                    }}
                    className="px-3 py-1 text-xs text-red-600 hover:bg-red-100 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {expandedId === playlist.id && playlist.songs.length > 0 && (
                <div className="border-t border-gray-200 bg-gray-50 p-2 space-y-1">
                  {playlist.songs.map((song, i) => (
                    <div key={`${song.videoId}-${i}`} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 w-5 text-right">{i + 1}</span>
                      <span className="text-gray-900 truncate flex-1">{song.title}</span>
                      <span className="text-gray-500 text-xs">{song.channel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

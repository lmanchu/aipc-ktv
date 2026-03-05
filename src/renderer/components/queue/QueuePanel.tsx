import { useQueueStore } from '../../store'
import { Song } from '../../types'

interface QueuePanelProps {
  className?: string
}

export default function QueuePanel({ className = '' }: QueuePanelProps) {
  const { currentSong, upcomingSongs, removeSong, nextSong, clearQueue } = useQueueStore()

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Queue</h2>
        <p className="text-sm text-gray-600">
          Now playing and upcoming songs
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Now Playing</h3>
        {currentSong ? (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <img
              src={currentSong.thumbnail.url}
              alt={currentSong.title}
              className="w-24 h-14 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-md line-clamp-1">
                {currentSong.title}
              </h4>
              <p className="text-sm text-gray-600 truncate">
                {currentSong.channelTitle}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>No song is currently playing.</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Next Up ({upcomingSongs.length})</h3>
          <div className="space-x-2">
            <button
              onClick={nextSong}
              disabled={upcomingSongs.length === 0}
              className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              Next Song
            </button>
            <button
              onClick={clearQueue}
              disabled={upcomingSongs.length === 0}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
        </div>
        
        {upcomingSongs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>The queue is empty. Add songs from the search panel.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {upcomingSongs.map((song: Song, index: number) => (
              <div
                key={`${song.videoId}-${index}`}
                className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg hover:shadow-sm"
              >
                <img
                  src={song.thumbnail.url}
                  alt={song.title}
                  className="w-16 h-9 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                    {song.title}
                  </h4>
                  <p className="text-xs text-gray-600 truncate">
                    {song.channelTitle}
                  </p>
                </div>
                <button
                  onClick={() => removeSong(index)}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-100 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

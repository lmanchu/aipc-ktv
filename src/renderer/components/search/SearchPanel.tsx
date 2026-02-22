import { useState, useCallback } from 'react'
import { useQueueStore } from '../../store'
import { YouTubeClient, YouTubeClient as YouTubeClientType } from '../../lib/youtube'
import type { YouTubeVideoDetails } from '../../lib/youtube'

interface SearchPanelProps {
  className?: string
}

export default function SearchPanel({ className = '' }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<YouTubeVideoDetails[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const { addSong, currentSong } = useQueueStore()

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setError('Please enter a search query')
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const client = new YouTubeClientType()
      const searchResult = await client.searchVideosWithDetails({
        query: query.trim(),
        maxResults: 10,
      })
      setResults(searchResult.videos)
      
      if (searchResult.videos.length === 0) {
        setError('No results found')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search videos'
      setError(errorMessage)
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }, [query])

  const handleAddToQueue = (video: YouTubeVideoDetails) => {
    const song = YouTubeClient.videoDetailsToSong(video)
    addSong(song)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Search YouTube</h2>
        <p className="text-sm text-gray-600">
          Find songs to add to your queue
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search for songs (e.g., Never Gonna Give You Up)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSearching}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">
            Results ({results.length})
          </h3>
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {results.map((video) => (
              <div
                key={video.videoId}
                className="flex gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <img
                  src={video.thumbnail.url}
                  alt={video.title}
                  className="w-32 h-20 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 line-clamp-2">
                    {video.title}
                  </h4>
                  <p className="text-sm text-gray-600 truncate">
                    {video.channelTitle}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{formatDuration(video.duration)}</span>
                    <span>{video.viewCount.toLocaleString()} views</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddToQueue(video)}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-center flex-shrink-0"
                  disabled={currentSong?.videoId === video.videoId}
                >
                  {currentSong?.videoId === video.videoId ? 'Playing' : 'Add to Queue'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!error && results.length === 0 && query.trim() && !isSearching && (
        <div className="text-center py-8 text-gray-500">
          <p>Enter a search query to find songs</p>
        </div>
      )}
    </div>
  )
}

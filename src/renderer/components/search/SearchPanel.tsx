import { useState, useCallback, useEffect } from 'react'
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
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  const { addSong, currentSong } = useQueueStore()

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query')
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const client = new YouTubeClientType()
      const searchResult = await client.searchVideosWithDetails({
        query: searchQuery.trim(),
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
  }, [])

  const handleRetry = useCallback(() => {
    setError(null)
    handleSearch(debouncedQuery)
  }, [debouncedQuery, handleSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch(debouncedQuery)
    }
  }, [debouncedQuery, handleSearch])

  const handleAddToQueue = (video: YouTubeVideoDetails) => {
    const song = YouTubeClient.videoDetailsToSong(video)
    addSong(song)
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

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs (e.g., Never Gonna Give You Up)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
          disabled={isSearching}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={handleRetry}
            className="ml-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">
            Results ({results.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
            {results.map((video) => (
              <div
                key={video.videoId}
                className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="relative">
                  <img
                    src={video.thumbnail.url}
                    alt={video.title}
                    className="w-full aspect-video object-cover rounded"
                  />
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                    {formatDuration(video.duration)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-2 leading-tight">
                    {video.title}
                  </h4>
                  <p className="text-xs text-gray-600 truncate mt-1">
                    {video.channelTitle}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {video.viewCount.toLocaleString()} views
                  </p>
                </div>
                <button
                  onClick={() => handleAddToQueue(video)}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={currentSong?.videoId === video.videoId}
                >
                  {currentSong?.videoId === video.videoId ? 'Playing' : 'Add to Queue'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!error && results.length === 0 && !query.trim() && !isSearching && (
        <div className="text-center py-8 text-gray-500">
          <p>Enter a search query to find songs</p>
        </div>
      )}

      {!error && results.length === 0 && query.trim() && isSearching && (
        <div className="text-center py-8 text-gray-500">
          <p>Searching for "{query}"...</p>
        </div>
      )}
    </div>
  )
}

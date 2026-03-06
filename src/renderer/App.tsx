import { useState, useEffect, useRef } from 'react'
import { useYouTubePlayer } from './hooks/useYouTubePlayer'
import { useQueueStore } from './store'
import { PlaybackState } from '../shared/types'
import YouTubeBrowser from './components/browser/YouTubeBrowser'
import QueuePanel from './components/queue/QueuePanel'
import PlaylistPanel from './components/playlist/PlaylistPanel'
import './App.css'

function App() {
  const [volume, setVolume] = useState(50)
  const prevSongRef = useRef<string | null>(null)

  const {
    isDisplayWindowOpen,
    openDisplayWindow,
    closeDisplayWindow,
    playVideo,
    pauseVideo,
    stopVideo,
    setVolume: setPlayerVolume,
    mute,
    unmute,
  } = useYouTubePlayer()

  const {
    currentSong,
    upcomingSongs,
    playbackState,
    nextSong,
  } = useQueueStore()

  // Auto-open display window on mount
  useEffect(() => {
    openDisplayWindow()
  }, [])

  // KEY: When currentSong changes, send play command to Display Window via IPC
  useEffect(() => {
    if (!currentSong || !isDisplayWindowOpen) return
    // Only send if song actually changed
    if (prevSongRef.current === currentSong.videoId) return
    prevSongRef.current = currentSong.videoId

    console.log('[Control] Playing video:', currentSong.videoId, currentSong.title)
    // Small delay to ensure display window is ready
    setTimeout(() => {
      playVideo(currentSong.videoId)
    }, 300)
  }, [currentSong, isDisplayWindowOpen, playVideo])

  // Listen for video-ended from Display Window → auto-advance
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return
    const { ipcRenderer } = window.electron

    const handleVideoEnded = () => {
      console.log('[Control] Video ended, advancing queue')
      nextSong()
    }

    ipcRenderer.on('video-ended', handleVideoEnded)
    return () => {
      window.electron?.ipcRenderer?.removeAllListeners('video-ended')
    }
  }, [nextSong])

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    setPlayerVolume(newVolume)
  }

  const handleSkip = () => {
    stopVideo()
    nextSong()
  }

  return (
    <div className="App flex flex-col h-screen">
      {/* Header with player controls */}
      <header className="shrink-0 px-4 py-2 border-b bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">AIPC KTV</h1>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              playbackState === PlaybackState.PLAYING ? 'bg-green-100 text-green-800' :
              playbackState === PlaybackState.PAUSED ? 'bg-yellow-100 text-yellow-800' :
              playbackState === PlaybackState.LOADING ? 'bg-blue-100 text-blue-800' :
              playbackState === PlaybackState.ERROR ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {playbackState.toUpperCase()}
            </div>
            <span className={`inline-block w-2 h-2 rounded-full ${
              isDisplayWindowOpen ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {!isDisplayWindowOpen && (
              <button onClick={openDisplayWindow}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                Open Display
              </button>
            )}
          </div>
        </div>

        {/* Now Playing bar */}
        {currentSong && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t">
            <img src={currentSong.thumbnail} alt="" className="w-10 h-10 rounded object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-xs text-gray-500 truncate">{currentSong.channel}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => playVideo()}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={!isDisplayWindowOpen}>
                Play
              </button>
              <button onClick={pauseVideo}
                className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                disabled={!isDisplayWindowOpen}>
                Pause
              </button>
              {/* Skip / 切歌 — the KTV essential button */}
              <button onClick={handleSkip}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-bold"
                disabled={!isDisplayWindowOpen}>
                切歌
              </button>
            </div>
            <div className="flex items-center gap-1 ml-1">
              <button onClick={mute} disabled={!isDisplayWindowOpen} className="text-xs text-gray-400 hover:text-gray-700">Mute</button>
              <input type="range" min="0" max="100" value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-16" disabled={!isDisplayWindowOpen} />
              <span className="text-xs text-gray-400 w-7">{volume}%</span>
            </div>
            {upcomingSongs.length > 0 && (
              <span className="text-xs text-gray-400">Next: {upcomingSongs[0].title.slice(0, 20)}...</span>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: YouTube Browser */}
        <div className="flex-1 p-2 flex flex-col">
          <YouTubeBrowser />
        </div>

        {/* Right: Queue + Playlists sidebar */}
        <div className="w-80 border-l bg-gray-50 overflow-y-auto p-3 space-y-4">
          <QueuePanel />
          <hr />
          <PlaylistPanel />
        </div>
      </main>
    </div>
  )
}

export default App

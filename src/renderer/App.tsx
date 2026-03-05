import { useState, useEffect } from 'react'
import UpdateElectron from './components/update'
import { useYouTubePlayer } from './hooks/useYouTubePlayer'
import { useQueueStore } from './store'
import { PlaybackState } from '../shared/types'
import SearchPanel from './components/search/SearchPanel'
import QueuePanel from './components/queue/QueuePanel'
import './App.css'

function App() {
  const [testVideoId, setTestVideoId] = useState('dQw4w9WgXcQ') // Rick Roll for testing
  const [seekTime, setSeekTime] = useState(0)
  const [volume, setVolume] = useState(50)
  
  const {
    isDisplayWindowOpen,
    openDisplayWindow,
    closeDisplayWindow,
    playVideo,
    pauseVideo,
    stopVideo,
    seekTo,
    setVolume: setPlayerVolume,
    mute,
    unmute,
    getPlayerState,
    playerState,
    lastError,
  } = useYouTubePlayer()

  const { 
    currentSong, 
    upcomingSongs, 
    playbackState, 
    addSong, 
    nextSong, 
    clearQueue 
  } = useQueueStore()

  // Listen for player state changes from display window
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const { ipcRenderer } = window.electron

    const handlePlayerStateChanged = (stateData: any) => {
      console.log('Player state changed:', stateData)
    }

    const handleVideoEnded = () => {
      console.log('Video ended, auto-advancing queue')
      nextSong()
    }

    const handleVolumeChanged = (volumeData: any) => {
      setVolume(volumeData.volume)
      console.log('Volume changed:', volumeData)
    }

    ipcRenderer.on('player-state-changed', handlePlayerStateChanged)
    ipcRenderer.on('video-ended', handleVideoEnded)
    ipcRenderer.on('volume-changed', handleVolumeChanged)

    return () => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeAllListeners('player-state-changed')
        window.electron.ipcRenderer.removeAllListeners('video-ended')
        window.electron.ipcRenderer.removeAllListeners('volume-changed')
      }
    }
  }, [nextSong])

  const handleTestSong = () => {
    const testSong = {
      videoId: testVideoId,
      title: 'Test Video',
      channel: 'Test Channel',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
      duration: 212, // 3:32
    }
    addSong(testSong)
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    setPlayerVolume(newVolume)
  }
  
  return (
    <div className="App">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-600">AIPC KTV Control</h1>
        <p className="text-lg text-gray-600 mt-2">Karaoke Control Center</p>
      </header>
      
      <main className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <SearchPanel />
          </div>
          <div className="card">
            <QueuePanel />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Display Window</h2>
            <div className="status-indicator mb-4">
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                isDisplayWindowOpen ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span>Status: {isDisplayWindowOpen ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="space-y-2">
              <button 
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                onClick={openDisplayWindow}
                disabled={isDisplayWindowOpen}
              >
                Open Display Window
              </button>
              <button 
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                onClick={closeDisplayWindow}
                disabled={!isDisplayWindowOpen}
              >
                Close Display Window
              </button>
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Player Controls</h2>
            <div className="mb-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
                playbackState === PlaybackState.PLAYING ? 'bg-green-100 text-green-800' :
                playbackState === PlaybackState.PAUSED ? 'bg-yellow-100 text-yellow-800' :
                playbackState === PlaybackState.LOADING ? 'bg-blue-100 text-blue-800' :
                playbackState === PlaybackState.ERROR ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {playbackState.toUpperCase()}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button 
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={() => playVideo()}
                disabled={!isDisplayWindowOpen}
              >
                ▶️ Play
              </button>
              <button 
                className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                onClick={pauseVideo}
                disabled={!isDisplayWindowOpen}
              >
                ⏸️ Pause
              </button>
              <button 
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                onClick={stopVideo}
                disabled={!isDisplayWindowOpen}
              >
                ⏹️ Stop
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Seek to (seconds):</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={seekTime}
                  onChange={(e) => setSeekTime(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border rounded"
                  min="0"
                />
                <button 
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  onClick={() => seekTo(seekTime)}
                  disabled={!isDisplayWindowOpen}
                >
                  Seek
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Volume: {volume}%</label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1"
                  disabled={!isDisplayWindowOpen}
                />
                <button 
                  className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  onClick={mute}
                  disabled={!isDisplayWindowOpen}
                >
                  🔇
                </button>
                <button 
                  className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  onClick={unmute}
                  disabled={!isDisplayWindowOpen}
                >
                  🔊
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Player State Debug</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Current State:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {playerState ? JSON.stringify(playerState, null, 2) : 'No state available'}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Errors:</h3>
              <pre className="bg-red-100 p-3 rounded text-sm overflow-x-auto">
                {lastError || 'No errors'}
              </pre>
            </div>
          </div>
        </div>

        <UpdateElectron />
      </main>
    </div>
  )
}

export default App

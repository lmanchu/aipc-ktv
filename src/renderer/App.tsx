import { useState } from 'react'
import UpdateElectron from './components/update'
import './App.css'

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Ready')
  
  return (
    <div className="App">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-600">AIPC KTV Control</h1>
        <p className="text-lg text-gray-600 mt-2">Karaoke Control Center</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Display Status</h2>
          <div className="status-indicator">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span>Display Window: {connectionStatus}</span>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => setConnectionStatus('Testing...')}
            >
              Test Display Connection
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">System Info</h2>
          <p className="text-sm text-gray-500">
            Control window for dual-screen karaoke system
          </p>
        </div>
      </div>

      <UpdateElectron />
    </div>
  )
}

export default App

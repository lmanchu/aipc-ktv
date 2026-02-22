import React from 'react'

const DisplayApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">AIPC KTV</h1>
        <p className="text-2xl text-gray-300">Display Window Ready</p>
        <div className="mt-8 text-lg text-gray-400">
          Connect to start your karaoke experience!
        </div>
      </div>
    </div>
  )
}

export default DisplayApp
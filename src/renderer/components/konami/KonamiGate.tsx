import { useState, useEffect, useCallback, useRef } from 'react'

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA',
  'KeyB', 'KeyA',
]

interface KonamiGateProps {
  children: React.ReactNode
}

export default function KonamiGate({ children }: KonamiGateProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [shake, setShake] = useState(false)
  const [activationCount, setActivationCount] = useState(0)
  const [showDisablePrompt, setShowDisablePrompt] = useState(false)
  const [dissolving, setDissolving] = useState(false)
  const inputRef = useRef<string[]>([])

  // Check saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('ktv-konami-skip')
    const count = parseInt(localStorage.getItem('ktv-konami-count') || '0', 10)
    setActivationCount(count)
    if (saved === 'true') {
      setUnlocked(true)
    }
    setLoading(false)
  }, [])

  const handleUnlock = useCallback(() => {
    const newCount = activationCount + 1
    setActivationCount(newCount)
    localStorage.setItem('ktv-konami-count', String(newCount))

    setDissolving(true)

    setTimeout(() => {
      if (newCount >= 3) {
        setShowDisablePrompt(true)
      } else {
        setUnlocked(true)
      }
    }, 800)
  }, [activationCount])

  const handleDisableChoice = useCallback((skip: boolean) => {
    if (skip) {
      localStorage.setItem('ktv-konami-skip', 'true')
    }
    setShowDisablePrompt(false)
    setUnlocked(true)
  }, [])

  useEffect(() => {
    if (unlocked || loading) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code
      const expected = KONAMI_CODE[inputRef.current.length]

      if (code === expected) {
        inputRef.current.push(code)
        setProgress(inputRef.current.length)

        if (inputRef.current.length === KONAMI_CODE.length) {
          handleUnlock()
        }
      } else {
        // Wrong key — reset
        if (inputRef.current.length > 0) {
          setShake(true)
          setTimeout(() => setShake(false), 400)
        }
        inputRef.current = []
        setProgress(0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [unlocked, loading, handleUnlock])

  if (loading) return null

  if (showDisablePrompt) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center space-y-6 px-8">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-white">
            You've mastered the code!
          </h2>
          <p className="text-gray-400 text-lg">
            已成功啟動 {activationCount} 次。要跳過啟動密碼嗎？
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <button
              onClick={() => handleDisableChoice(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg text-lg font-medium hover:bg-green-500 transition"
            >
              跳過密碼
            </button>
            <button
              onClick={() => handleDisableChoice(false)}
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg text-lg font-medium hover:bg-gray-600 transition"
            >
              保留儀式感
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (unlocked) return <>{children}</>

  return (
    <div
      className={`fixed inset-0 bg-black flex flex-col items-center justify-center z-50 transition-opacity duration-700 ${
        dissolving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className={`text-center mb-16 ${shake ? 'animate-shake' : ''}`}>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
          IrisGo Karaoke
        </h1>
        <p className="text-gray-600 mt-6 text-lg">
          輸入經典秘技以啟動
        </p>
        <p className="text-gray-800 mt-2 text-sm">
          If you know, you know.
        </p>
      </div>

      {/* Progress dots — no code revealed */}
      <div className="flex gap-2 mb-6">
        {KONAMI_CODE.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              i < progress
                ? 'bg-purple-500 shadow-lg shadow-purple-500/50 scale-125'
                : 'bg-gray-800'
            }`}
          />
        ))}
      </div>

      {/* Subtle progress bar */}
      <div className="w-48 h-0.5 bg-gray-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
          style={{ width: `${(progress / KONAMI_CODE.length) * 100}%` }}
        />
      </div>
    </div>
  )
}

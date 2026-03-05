import React, { useState, useEffect, useRef } from 'react'

export interface SubtitleCue {
  startTime: number // seconds
  endTime: number   // seconds
  text: string
}

interface SubtitleOverlayProps {
  cues: SubtitleCue[]
  currentTime: number // seconds, from player state
  position?: 'overlay' | 'below'
}

/**
 * Parse SRT subtitle content into cues
 */
export function parseSRT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  const blocks = content.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    )
    if (!timeMatch) continue

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000

    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000

    const text = lines.slice(2).join('\n')
    cues.push({ startTime, endTime, text })
  }

  return cues
}

/**
 * Parse LRC lyrics content into cues
 */
export function parseLRC(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  const lines = content.trim().split('\n')

  const timestamps: Array<{ time: number; text: string }> = []

  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/)
    if (!match) continue

    const time =
      parseInt(match[1]) * 60 +
      parseInt(match[2]) +
      parseInt(match[3].padEnd(3, '0')) / 1000

    const text = match[4].trim()
    if (text) timestamps.push({ time, text })
  }

  for (let i = 0; i < timestamps.length; i++) {
    cues.push({
      startTime: timestamps[i].time,
      endTime: i + 1 < timestamps.length ? timestamps[i + 1].time : timestamps[i].time + 5,
      text: timestamps[i].text,
    })
  }

  return cues
}

export default function SubtitleOverlay({
  cues,
  currentTime,
  position = 'overlay',
}: SubtitleOverlayProps) {
  const [activeCue, setActiveCue] = useState<SubtitleCue | null>(null)
  const [nextCue, setNextCue] = useState<SubtitleCue | null>(null)

  useEffect(() => {
    const current = cues.find(
      (c) => currentTime >= c.startTime && currentTime < c.endTime
    ) || null

    setActiveCue(current)

    // Find next cue for preview
    if (current) {
      const idx = cues.indexOf(current)
      setNextCue(idx + 1 < cues.length ? cues[idx + 1] : null)
    } else {
      const next = cues.find((c) => c.startTime > currentTime) || null
      setNextCue(next)
    }
  }, [currentTime, cues])

  if (cues.length === 0) return null

  if (position === 'below') {
    return (
      <div className="bg-gray-900 px-6 py-4 text-center border-t border-gray-700">
        <div
          className="text-2xl font-bold text-white min-h-[2em] flex items-center justify-center transition-opacity duration-200"
          style={{ opacity: activeCue ? 1 : 0.3 }}
        >
          {activeCue?.text || '♪ ♪ ♪'}
        </div>
        {nextCue && (
          <div className="text-lg text-gray-500 mt-1 min-h-[1.5em]">
            {nextCue.text}
          </div>
        )}
      </div>
    )
  }

  // Overlay mode — transparent div on top of video
  return (
    <div
      className="absolute bottom-20 left-0 right-0 text-center pointer-events-none z-10 px-8"
    >
      <div
        className="inline-block px-6 py-3 rounded-lg transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          opacity: activeCue ? 1 : 0,
        }}
      >
        <div className="text-3xl font-bold text-white leading-snug"
          dangerouslySetInnerHTML={{ __html: activeCue?.text || '' }}
        />
      </div>
      {nextCue && activeCue && (
        <div className="mt-2">
          <span className="inline-block px-4 py-1 rounded text-lg text-gray-300"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          >
            {nextCue.text}
          </span>
        </div>
      )}
    </div>
  )
}

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.ipcRenderer for all tests
Object.defineProperty(window, 'ipcRenderer', {
  value: {
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn(),
    handle: vi.fn(),
  },
  writable: true,
})

// Mock YouTube API globals
Object.defineProperty(window, 'YT', {
  value: {
    Player: vi.fn(),
    PlayerState: {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5,
    },
    ready: vi.fn(),
  },
  writable: true,
})

// Mock DOM methods used by YouTube API loader
Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    src: '',
    parentNode: null,
  })),
  writable: true,
})

Object.defineProperty(document, 'getElementsByTagName', {
  value: vi.fn(() => [{ parentNode: { insertBefore: vi.fn() } }]),
  writable: true,
})

// Add proper DOM properties for React
Object.defineProperty(globalThis, 'HTMLElement', {
  value: class MockHTMLElement {
    style = {}
  },
  writable: true,
})

// Mock Element and Node
if (typeof Element === 'undefined') {
  global.Element = {} as any
  global.Node = {} as any
}

// Mock console.log to reduce test output noise
vi.spyOn(console, 'log').mockImplementation(() => {})
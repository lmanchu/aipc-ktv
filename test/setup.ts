import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage before any tests run - needed for Zustand persist middleware
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] || null,
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock document.body.style to prevent React DOM vendor-prefixed event errors
if (!document.body.style) {
  Object.defineProperty(document.body, 'style', {
    value: {},
    writable: true,
  })
}

// Mock document.documentElement to prevent React DOM errors
Object.defineProperty(document, 'documentElement', {
  value: {
    style: {},
  },
  writable: true,
})

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
    get scrollTop() { return 0 }
    get scrollLeft() { return 0 }
    get clientWidth() { return 0 }
    get clientHeight() { return 0 }
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }
    }
  },
  writable: true,
})

// Mock Element and Node
if (typeof Element === 'undefined') {
  global.Element = {} as any
  global.Node = {} as any
}

// Mock window.getComputedStyle to handle style checks
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn(() => ({
    getPropertyValue: vi.fn(() => ''),
  })),
  writable: true,
})

// Mock document.documentElement.style for React's feature detection
Object.defineProperty(document, 'documentElement', {
  value: {
    style: {
      WebkitAnimation: undefined,
      webkitAnimation: undefined,
      MozAnimation: undefined,
      msAnimation: undefined,
      OAnimation: undefined,
      animation: undefined,
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  },
  writable: true,
})

// Ensure document.body.style exists with all vendor prefixes
Object.defineProperty(document.body, 'style', {
  value: {
    WebkitAnimation: undefined,
    webkitAnimation: undefined,
    MozAnimation: undefined,
    msAnimation: undefined,
    OAnimation: undefined,
    animation: undefined,
  },
  writable: true,
})

// Mock all elements to have style
Object.defineProperty(HTMLElement.prototype, 'style', {
  value: {
    WebkitAnimation: undefined,
    webkitAnimation: undefined,
    MozAnimation: undefined,
    msAnimation: undefined,
    OAnimation: undefined,
    animation: undefined,
  },
  writable: true,
})

// Mock console.log to reduce test output noise
vi.spyOn(console, 'log').mockImplementation(() => {})
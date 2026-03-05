import { beforeAll, afterAll } from 'vitest'

// Mock localStorage for Zustand persist middleware
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}
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
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

beforeAll(() => {
  // Reset mock before each test
  localStorageMock.clear()
})

afterAll(() => {
  // Clean up after all tests
  localStorageMock.clear()
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { StorageService, getStorageService, resetStorageService } from '../src/main/storage'
import { PlaylistStorageService } from '../src/renderer/services/playlistStorage'
import { QueueStorageService } from '../src/renderer/services/queueStorage'
import { StorageMigrationService } from '../src/renderer/services/storageMigration'
import type { Playlist, Song, Queue } from '../src/renderer/types'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data'),
  },
}))

const mockSong: Song = {
  videoId: 'test123',
  title: 'Test Song',
  channel: 'Test Channel',
  thumbnail: 'https://example.com/thumb.jpg',
  duration: 180,
}

const mockPlaylist: Playlist = {
  id: 'test-playlist-1',
  name: 'Test Playlist',
  songs: [mockSong],
  createdAt: Date.now(),
}

const mockQueue: Queue = {
  currentSong: mockSong,
  upcomingSongs: [mockSong],
  playbackState: 'playing',
}

const mockStorageAPI = {
  read: vi.fn(),
  write: vi.fn(),
  exists: vi.fn(),
  delete: vi.fn(),
  ensureDirectory: vi.fn(),
}

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
}

Object.defineProperty(globalThis, 'window', {
  value: {
    electron: {
      storage: mockStorageAPI,
    },
  },
  writable: true,
})

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('Storage Layer Unit Tests', () => {
  describe('StorageService', () => {
    let storageService: StorageService

    beforeEach(() => {
      resetStorageService()
      storageService = getStorageService()
      vi.clearAllMocks()
    })

    describe('Initialization', () => {
      it('should create a storage service instance', () => {
        expect(storageService).toBeInstanceOf(StorageService)
      })

      it('should have correct userData path', () => {
        const path = storageService.getUserDataPath()
        expect(path).toBe('/tmp/test-user-data')
      })

      it('should return string from getUserDataPath', () => {
        const path = storageService.getUserDataPath()
        expect(typeof path).toBe('string')
        expect(path.length).toBeGreaterThan(0)
      })
    })

    describe('read() method', () => {
      it('should read JSON file successfully', async () => {
        const testData = { key: 'value' }
        await storageService.write('test-read.json', testData)
        const result = await storageService.read('test-read.json')
        expect(result).toEqual(testData)
      })

      it('should return null for non-existent file', async () => {
        const result = await storageService.read('non-existent.json')
        expect(result).toBeNull()
      })

      it('should handle malformed JSON gracefully', async () => {
        const fs = require('node:fs/promises')
        vi.spyOn(fs, 'writeFile').mockResolvedValueOnce(undefined)
        vi.spyOn(fs, 'readFile').mockResolvedValueOnce('invalid json')
        await expect(storageService.read('test-malformed.json')).rejects.toThrow()
      })

      it('should handle empty JSON object', async () => {
        await storageService.write('empty-object.json', {})
        const result = await storageService.read('empty-object.json')
        expect(result).toEqual({})
      })

      it('should handle JSON array', async () => {
        const testData = [1, 2, 3]
        await storageService.write('array.json', testData)
        const result = await storageService.read<number[]>('array.json')
        expect(result).toEqual(testData)
      })

      it('should handle deeply nested objects', async () => {
        const testData = { level1: { level2: { level3: { value: 'deep' } } } }
        await storageService.write('deep.json', testData)
        const result = await storageService.read('deep.json')
        expect(result).toEqual(testData)
      })

      it('should handle special characters in data', async () => {
        const testData = { text: 'Special chars: <>&"\'\\' }
        await storageService.write('special.json', testData)
        const result = await storageService.read('special.json')
        expect(result).toEqual(testData)
      })

      it('should handle Unicode characters', async () => {
        const testData = { text: 'Hello 世界 🌍' }
        await storageService.write('unicode.json', testData)
        const result = await storageService.read('unicode.json')
        expect(result).toEqual(testData)
      })

      it('should handle boolean values', async () => {
        await storageService.write('bool-true.json', true)
        await storageService.write('bool-false.json', false)
        const result1 = await storageService.read<boolean>('bool-true.json')
        const result2 = await storageService.read<boolean>('bool-false.json')
        expect(result1).toBe(true)
        expect(result2).toBe(false)
      })

      it('should handle null values', async () => {
        await storageService.write('null.json', null)
        const result = await storageService.read('null.json')
        expect(result).toBeNull()
      })

      it('should handle numeric values', async () => {
        await storageService.write('number-int.json', 42)
        await storageService.write('number-float.json', 3.14)
        await storageService.write('number-negative.json', -100)
        await storageService.write('number-zero.json', 0)
        
        const intResult = await storageService.read<number>('number-int.json')
        const floatResult = await storageService.read<number>('number-float.json')
        const negativeResult = await storageService.read<number>('number-negative.json')
        const zeroResult = await storageService.read<number>('number-zero.json')
        
        expect(intResult).toBe(42)
        expect(floatResult).toBe(3.14)
        expect(negativeResult).toBe(-100)
        expect(zeroResult).toBe(0)
      })

      it('should handle large data sets', async () => {
        const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `item-${i}` }))
        await storageService.write('large.json', largeArray)
        const result = await storageService.read<typeof largeArray>('large.json')
        expect(result).toHaveLength(1000)
        expect(result?.[0]).toEqual({ id: 0, name: 'item-0' })
      })
    })

    describe('write() method', () => {
      it('should write JSON file successfully', async () => {
        const testData = { key: 'value' }
        await storageService.write('test-write.json', testData)
        const exists = await storageService.exists('test-write.json')
        expect(exists).toBe(true)
      })

      it('should overwrite existing file', async () => {
        await storageService.write('overwrite.json', { version: 1 })
        await storageService.write('overwrite.json', { version: 2 })
        const result = await storageService.read<{ version: number }>('overwrite.json')
        expect(result?.version).toBe(2)
      })

      it('should create directory if not exists', async () => {
        const testData = { nested: true }
        await storageService.write('deep/nested/file.json', testData)
        const result = await storageService.read('deep/nested/file.json')
        expect(result).toEqual(testData)
      })

      it('should handle object write', async () => {
        const testData = { key1: 'value1', key2: 123 }
        await expect(storageService.write('object.json', testData)).resolves.not.toThrow()
      })

      it('should handle array write', async () => {
        const testData = [1, 2, 3, 4, 5]
        await expect(storageService.write('array-write.json', testData)).resolves.not.toThrow()
      })

      it('should handle primitive writes', async () => {
        await expect(storageService.write('string.json', 'test string')).resolves.not.toThrow()
        await expect(storageService.write('number.json', 123)).resolves.not.toThrow()
        await expect(storageService.write('boolean.json', true)).resolves.not.toThrow()
        await expect(storageService.write('null.json', null)).resolves.not.toThrow()
      })

      it('should write pretty-printed JSON', async () => {
        const testData = { key: 'value' }
        await storageService.write('pretty.json', testData)
        const fs = require('node:fs/promises')
        const content = await fs.readFile('/tmp/test-user-data/pretty.json', 'utf-8')
        expect(content).toContain('  ')
      })

      it('should handle concurrent writes', async () => {
        const promises = []
        for (let i = 0; i < 10; i++) {
          promises.push(storageService.write(`concurrent-${i}.json`, { id: i }))
        }
        await expect(Promise.all(promises)).resolves.not.toThrow()
        
        for (let i = 0; i < 10; i++) {
          const result = await storageService.read<{ id: number }>(`concurrent-${i}.json`)
          expect(result?.id).toBe(i)
        }
      })
    })

    describe('exists() method', () => {
      it('should return true for existing file', async () => {
        await storageService.write('exists-true.json', { test: true })
        const exists = await storageService.exists('exists-true.json')
        expect(exists).toBe(true)
      })

      it('should return false for non-existent file', async () => {
        const exists = await storageService.exists('does-not-exist.json')
        expect(exists).toBe(false)
      })

      it('should handle files with different extensions', async () => {
        await storageService.write('test.json', { json: true })
        await storageService.write('test.txt', { text: true })
        
        expect(await storageService.exists('test.json')).toBe(true)
        expect(await storageService.exists('test.txt')).toBe(true)
      })

      it('should handle nested file paths', async () => {
        await storageService.ensureDirectory('level1/level2')
        await storageService.write('level1/level2/file.json', { nested: true })
        expect(await storageService.exists('level1/level2/file.json')).toBe(true)
      })

      it('should handle files with special characters', async () => {
        await storageService.write('file-with-dash.json', { test: true })
        await storageService.write('file_with_underscore.json', { test: true })
        
        expect(await storageService.exists('file-with-dash.json')).toBe(true)
        expect(await storageService.exists('file_with_underscore.json')).toBe(true)
      })
    })

    describe('delete() method', () => {
      it('should delete existing file', async () => {
        await storageService.write('delete-test.json', { test: true })
        expect(await storageService.exists('delete-test.json')).toBe(true)
        
        await storageService.delete('delete-test.json')
        expect(await storageService.exists('delete-test.json')).toBe(false)
      })

      it('should handle deleting non-existent file gracefully', async () => {
        await expect(storageService.delete('never-existed.json')).resolves.not.toThrow()
      })

      it('should delete files in nested directories', async () => {
        await storageService.ensureDirectory('nested')
        await storageService.write('nested/delete-test.json', { test: true })
        await storageService.delete('nested/delete-test.json')
        expect(await storageService.exists('nested/delete-test.json')).toBe(false)
      })

      it('should handle multiple deletes', async () => {
        for (let i = 0; i < 5; i++) {
          await storageService.write(`multi-delete-${i}.json`, { id: i })
        }
        
        for (let i = 0; i < 5; i++) {
          await storageService.delete(`multi-delete-${i}.json`)
        }
        
        for (let i = 0; i < 5; i++) {
          expect(await storageService.exists(`multi-delete-${i}.json`)).toBe(false)
        }
      })
    })

    describe('ensureDirectory() method', () => {
      it('should create single directory', async () => {
        await storageService.ensureDirectory('single-dir')
        await storageService.write('single-dir/file.json', { test: true })
        expect(await storageService.exists('single-dir/file.json')).toBe(true)
      })

      it('should create nested directories', async () => {
        await storageService.ensureDirectory('parent/child/grandchild')
        await storageService.write('parent/child/grandchild/file.json', { deep: true })
        expect(await storageService.exists('parent/child/grandchild/file.json')).toBe(true)
      })

      it('should handle existing directory', async () => {
        await storageService.ensureDirectory('existing-dir')
        await expect(storageService.ensureDirectory('existing-dir')).resolves.not.toThrow()
      })

      it('should handle deep nesting', async () => {
        await storageService.ensureDirectory('a/b/c/d/e/f/g')
        await storageService.write('a/b/c/d/e/f/g/deep.json', { very: true })
        expect(await storageService.exists('a/b/c/d/e/f/g/deep.json')).toBe(true)
      })

      it('should handle directory with special characters', async () => {
        await storageService.ensureDirectory('dir-with-dash/dir_with_underscore')
        await storageService.write('dir-with-dash/dir_with_underscore/file.json', { test: true })
        expect(await storageService.exists('dir-with-dash/dir_with_underscore/file.json')).toBe(true)
      })
    })

    describe('Error Handling', () => {
      it('should handle permission errors', async () => {
        const fs = require('node:fs/promises')
        const spy = vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('EACCES: permission denied'))
        await expect(storageService.write('permission-test.json', {})).rejects.toThrow()
        spy.mockRestore()
      })

      it('should handle disk space errors', async () => {
        const fs = require('node:fs/promises')
        const spy = vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('ENOSPC: no space left on device'))
        await expect(storageService.write('space-test.json', {})).rejects.toThrow()
        spy.mockRestore()
      })

      it('should handle empty filename as error', async () => {
        await expect(storageService.read('')).rejects.toThrow()
        await expect(storageService.write('', {})).rejects.toThrow()
      })

      it('should handle ENOENT errors gracefully in read', async () => {
        const result = await storageService.read('absent.json')
        expect(result).toBeNull()
      })

      it('should handle ENOENT errors gracefully in delete', async () => {
        await expect(storageService.delete('absent.json')).resolves.not.toThrow()
      })
    })

    describe('Singleton Pattern', () => {
      it('should return same instance on multiple calls', () => {
        const instance1 = getStorageService()
        const instance2 = getStorageService()
        expect(instance1).toBe(instance2)
      })

      it('should return new instance after reset', () => {
        const instance1 = getStorageService()
        resetStorageService()
        const instance2 = getStorageService()
        expect(instance1).not.toBe(instance2)
      })
    })

    describe('Integration Tests', () => {
      it('should handle complete CRUD cycle', async () => {
        const testData = { cycle: 'complete' }
        
        await storageService.write('crud-test.json', testData)
        expect(await storageService.exists('crud-test.json')).toBe(true)
        
        const read = await storageService.read('crud-test.json')
        expect(read).toEqual(testData)
        
        await storageService.delete('crud-test.json')
        expect(await storageService.exists('crud-test.json')).toBe(false)
      })

      it('should handle multiple file operations in sequence', async () => {
        const files = ['file1.json', 'file2.json', 'file3.json']
        
        for (const file of files) {
          await storageService.write(file, { name: file })
        }
        
        for (const file of files) {
          expect(await storageService.exists(file)).toBe(true)
          const data = await storageService.read<{ name: string }>(file)
          expect(data?.name).toBe(file)
        }
        
        for (const file of files) {
          await storageService.delete(file)
        }
        
        for (const file of files) {
          expect(await storageService.exists(file)).toBe(false)
        }
      })

      it('should maintain data integrity across operations', async () => {
        const complexData = {
          numbers: [1, 2, 3, 4, 5],
          strings: ['a', 'b', 'c'],
          boolean: true,
          null: null,
          object: { nested: { value: 42 } },
        }
        
        await storageService.write('integrity.json', complexData)
        const result = await storageService.read<typeof complexData>('integrity.json')
        
        expect(result).toEqual(complexData)
        expect(result?.numbers).toEqual([1, 2, 3, 4, 5])
        expect(result?.strings).toEqual(['a', 'b', 'c'])
        expect(result?.boolean).toBe(true)
        expect(result?.null).toBeNull()
        expect(result?.object?.nested?.value).toBe(42)
      })
    })
  })

  describe('PlaylistStorageService', () => {
    const originalWindow = globalThis.window

    beforeEach(() => {
      vi.clearAllMocks()
      PlaylistStorageService.resetInstance()
      mockStorageAPI.read.mockClear()
      mockStorageAPI.write.mockClear()
      mockStorageAPI.exists.mockClear()
      
      Object.defineProperty(globalThis, 'window', {
        value: {
          electron: {
            storage: mockStorageAPI,
          },
        },
        writable: true,
      })
    })

    afterEach(() => {
      PlaylistStorageService.resetInstance()
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
      })
    })

    describe('Singleton Pattern', () => {
      it('should return same instance', () => {
        const instance1 = PlaylistStorageService.getInstance()
        const instance2 = PlaylistStorageService.getInstance()
        expect(instance1).toBe(instance2)
      })

      it('should create new instance after reset', () => {
        const instance1 = PlaylistStorageService.getInstance()
        PlaylistStorageService.resetInstance()
        const instance2 = PlaylistStorageService.getInstance()
        expect(instance1).not.toBe(instance2)
      })
    })

    describe('load() method', () => {
      it('should load playlists successfully', async () => {
        mockStorageAPI.read.mockResolvedValue({ success: true, data: [mockPlaylist] })
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.load()
        expect(result).toEqual([mockPlaylist])
        expect(mockStorageAPI.read).toHaveBeenCalledWith('playlists.json')
      })

      it('should return empty array on failure', async () => {
        mockStorageAPI.read.mockResolvedValue({ success: false, error: 'Read failed' })
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.load()
        expect(result).toEqual([])
      })

      it('should return empty array when no data exists', async () => {
        mockStorageAPI.read.mockResolvedValue({ success: true, data: null })
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.load()
        expect(result).toEqual([])
      })

      it('should handle exceptions', async () => {
        mockStorageAPI.read.mockRejectedValue(new Error('Network error'))
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.load()
        expect(result).toEqual([])
      })

      it('should load multiple playlists', async () => {
        const playlists = [mockPlaylist, { ...mockPlaylist, id: 'playlist-2' }]
        mockStorageAPI.read.mockResolvedValue({ success: true, data: playlists })
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.load()
        expect(result).toHaveLength(2)
      })
    })

    describe('save() method', () => {
      it('should save playlists successfully', async () => {
        mockStorageAPI.write.mockResolvedValue({ success: true })
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.save([mockPlaylist])
        expect(result).toBe(true)
        expect(mockStorageAPI.write).toHaveBeenCalledWith('playlists.json', [mockPlaylist])
      })

      it('should return false on failure', async () => {
        mockStorageAPI.write.mockResolvedValue({ success: false, error: 'Write failed' })
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.save([mockPlaylist])
        expect(result).toBe(false)
      })

      it('should handle exceptions', async () => {
        mockStorageAPI.write.mockRejectedValue(new Error('Network error'))
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.save([mockPlaylist])
        expect(result).toBe(false)
      })

      it('should save empty playlist array', async () => {
        mockStorageAPI.write.mockResolvedValue({ success: true })
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.save([])
        expect(result).toBe(true)
        expect(mockStorageAPI.write).toHaveBeenCalledWith('playlists.json', [])
      })
    })

    describe('exists() method', () => {
      it('should return true when file exists', async () => {
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: true })
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.exists()
        expect(result).toBe(true)
      })

      it('should return false when file does not exist', async () => {
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.exists()
        expect(result).toBe(false)
      })

      it('should return false on failure', async () => {
        mockStorageAPI.exists.mockRejectedValue(new Error('Check failed'))
        const service = PlaylistStorageService.getInstance()
        
        const result = await service.exists()
        expect(result).toBe(false)
      })
    })

    describe('getError() method', () => {
      it('should handle Error objects', () => {
        const service = PlaylistStorageService.getInstance()
        const error = new Error('Test error')
        
        const result = service.getError(error)
        expect(result.message).toBe('Test error')
      })

      it('should handle string errors', () => {
        const service = PlaylistStorageService.getInstance()
        const error = 'String error'
        
        const result = service.getError(error)
        expect(result.message).toBe('String error')
      })

      it('should handle unknown errors', () => {
        const service = PlaylistStorageService.getInstance()
        const error = { custom: 'error' }
        
        const result = service.getError(error)
        expect(result.message).toBe('[object Object]')
      })
    })
  })

  describe('QueueStorageService', () => {
    const originalWindow = globalThis.window

    beforeEach(() => {
      vi.clearAllMocks()
      QueueStorageService.resetInstance()
      mockStorageAPI.read.mockClear()
      mockStorageAPI.write.mockClear()
      mockStorageAPI.exists.mockClear()
      
      Object.defineProperty(globalThis, 'window', {
        value: {
          electron: {
            storage: mockStorageAPI,
          },
        },
        writable: true,
      })
    })

    afterEach(() => {
      QueueStorageService.resetInstance()
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
      })
    })

    describe('Singleton Pattern', () => {
      it('should return same instance', () => {
        const instance1 = QueueStorageService.getInstance()
        const instance2 = QueueStorageService.getInstance()
        expect(instance1).toBe(instance2)
      })

      it('should create new instance after reset', () => {
        const instance1 = QueueStorageService.getInstance()
        QueueStorageService.resetInstance()
        const instance2 = QueueStorageService.getInstance()
        expect(instance1).not.toBe(instance2)
      })
    })

    describe('load() method', () => {
      it('should load queue successfully', async () => {
        mockStorageAPI.read.mockResolvedValue({ success: true, data: mockQueue })
        const service = QueueStorageService.getInstance()
        
        const result = await service.load()
        expect(result).toEqual(mockQueue)
        expect(mockStorageAPI.read).toHaveBeenCalledWith('queue.json')
      })

      it('should return null on failure', async () => {
        mockStorageAPI.read.mockResolvedValue({ success: false, error: 'Read failed' })
        const service = QueueStorageService.getInstance()
        
        const result = await service.load()
        expect(result).toBeNull()
      })

      it('should return null when no data exists', async () => {
        mockStorageAPI.read.mockResolvedValue({ success: true, data: null })
        const service = QueueStorageService.getInstance()
        
        const result = await service.load()
        expect(result).toBeNull()
      })

      it('should handle missing properties with defaults', async () => {
        const partialQueue = { currentSong: mockSong, upcomingSongs: [] }
        mockStorageAPI.read.mockResolvedValue({ success: true, data: partialQueue })
        const service = QueueStorageService.getInstance()
        
        const result = await service.load()
        expect(result?.currentSong).toEqual(mockSong)
        expect(result?.upcomingSongs).toEqual([])
        expect(result?.playbackState).toBeUndefined()
      })

      it('should handle exceptions', async () => {
        mockStorageAPI.read.mockRejectedValue(new Error('Network error'))
        const service = QueueStorageService.getInstance()
        
        const result = await service.load()
        expect(result).toBeNull()
      })
    })

    describe('save() method', () => {
      it('should save queue successfully', async () => {
        mockStorageAPI.write.mockResolvedValue({ success: true })
        const service = QueueStorageService.getInstance()
        
        const result = await service.save(mockQueue)
        expect(result).toBe(true)
        expect(mockStorageAPI.write).toHaveBeenCalledWith('queue.json', mockQueue)
      })

      it('should return false on failure', async () => {
        mockStorageAPI.write.mockResolvedValue({ success: false, error: 'Write failed' })
        const service = QueueStorageService.getInstance()
        
        const result = await service.save(mockQueue)
        expect(result).toBe(false)
      })

      it('should handle exceptions', async () => {
        mockStorageAPI.write.mockRejectedValue(new Error('Network error'))
        const service = QueueStorageService.getInstance()
        
        const result = await service.save(mockQueue)
        expect(result).toBe(false)
      })

      it('should save queue with empty songs', async () => {
        const emptyQueue: Queue = {
          currentSong: null,
          upcomingSongs: [],
          playbackState: 'idle',
        }
        mockStorageAPI.write.mockResolvedValue({ success: true })
        const service = QueueStorageService.getInstance()
        
        const result = await service.save(emptyQueue)
        expect(result).toBe(true)
      })
    })

    describe('exists() method', () => {
      it('should return true when file exists', async () => {
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: true })
        const service = QueueStorageService.getInstance()
        
        const result = await service.exists()
        expect(result).toBe(true)
      })

      it('should return false when file does not exist', async () => {
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
        const service = QueueStorageService.getInstance()
        
        const result = await service.exists()
        expect(result).toBe(false)
      })

      it('should return false on failure', async () => {
        mockStorageAPI.exists.mockRejectedValue(new Error('Check failed'))
        const service = QueueStorageService.getInstance()
        
        const result = await service.exists()
        expect(result).toBe(false)
      })
    })

    describe('getError() method', () => {
      it('should handle Error objects', () => {
        const service = QueueStorageService.getInstance()
        const error = new Error('Test error')
        
        const result = service.getError(error)
        expect(result.message).toBe('Test error')
      })

      it('should handle string errors', () => {
        const service = QueueStorageService.getInstance()
        const error = 'String error'
        
        const result = service.getError(error)
        expect(result.message).toBe('String error')
      })

      it('should handle unknown errors', () => {
        const service = QueueStorageService.getInstance()
        const error = { custom: 'error' }
        
        const result = service.getError(error)
        expect(result.message).toBe('[object Object]')
      })
    })
  })

  describe('StorageMigrationService', () => {
    const originalWindow = globalThis.window
    const originalLocalStorage = globalThis.localStorage

    beforeEach(() => {
      vi.clearAllMocks()
      StorageMigrationService.resetInstance()
      localStorageMock.getItem.mockClear()
      localStorageMock.removeItem.mockClear()
      localStorageMock.getItem.mockReturnValue(null)
      mockStorageAPI.read.mockClear()
      mockStorageAPI.write.mockClear()
      mockStorageAPI.exists.mockClear()
      
      Object.defineProperty(globalThis, 'window', {
        value: {
          electron: {
            storage: mockStorageAPI,
          },
        },
        writable: true,
      })
      Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
        writable: true,
      })
    })

    afterEach(() => {
      StorageMigrationService.resetInstance()
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
      })
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      })
    })

    describe('Singleton Pattern', () => {
      it('should return same instance', () => {
        const instance1 = StorageMigrationService.getInstance()
        const instance2 = StorageMigrationService.getInstance()
        expect(instance1).toBe(instance2)
      })

      it('should create new instance after reset', () => {
        const instance1 = StorageMigrationService.getInstance()
        StorageMigrationService.resetInstance()
        const instance2 = StorageMigrationService.getInstance()
        expect(instance1).not.toBe(instance2)
      })
    })

    describe('checkMigrationStatus()', () => {
      it('should report no migration needed when no data', async () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
        const service = StorageMigrationService.getInstance()
        
        const status = await service.checkMigrationStatus()
        expect(status.needsMigration).toBe(false)
        expect(status.hasLocalStorageData).toBe(false)
        expect(status.hasFileData).toBe(false)
      })

      it('should report migration needed when localStorage has data', async () => {
        const localStorageData = { state: { playlists: [mockPlaylist] } }
        localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
        const service = StorageMigrationService.getInstance()
        
        const status = await service.checkMigrationStatus()
        expect(status.needsMigration).toBe(true)
        expect(status.hasLocalStorageData).toBe(true)
      })

      it('should not migrate when file already exists', async () => {
        const localStorageData = { state: { playlists: [mockPlaylist] } }
        localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: true })
        const service = StorageMigrationService.getInstance()
        
        const status = await service.checkMigrationStatus()
        expect(status.needsMigration).toBe(false)
        expect(status.hasFileData).toBe(true)
      })
    })

    describe('migrate()', () => {
      it('should successfully migrate data', async () => {
        const localStorageData = { state: { playlists: [mockPlaylist] } }
        localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
        mockStorageAPI.write.mockResolvedValue({ success: true })
        const service = StorageMigrationService.getInstance()
        
        const result = await service.migrate()
        expect(result.success).toBe(true)
        expect(result.migrated).toBe(true)
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('playlist-store')
      })

      it('should not migrate when no data exists', async () => {
        localStorageMock.getItem.mockReturnValue(null)
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
        const service = StorageMigrationService.getInstance()
        
        const result = await service.migrate()
        expect(result.success).toBe(true)
        expect(result.migrated).toBe(false)
      })

      it('should handle write failures', async () => {
        const localStorageData = { state: { playlists: [mockPlaylist] } }
        localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
        mockStorageAPI.write.mockResolvedValue({ success: false, error: 'Write failed' })
        const service = StorageMigrationService.getInstance()
        
        const result = await service.migrate()
        expect(result.success).toBe(false)
        expect(result.migrated).toBe(false)
      })

      it('should handle exceptions', async () => {
        const localStorageData = { state: { playlists: [mockPlaylist] } }
        localStorageMock.getItem.mockReturnValue(JSON.stringify(localStorageData))
        mockStorageAPI.exists.mockResolvedValue({ success: true, exists: false })
        mockStorageAPI.write.mockRejectedValue(new Error('Network error'))
        const service = StorageMigrationService.getInstance()
        
        const result = await service.migrate()
        expect(result.success).toBe(false)
        expect(result.migrated).toBe(false)
      })
    })

    describe('getLocalStorageKey()', () => {
      it('should return correct key', () => {
        const service = StorageMigrationService.getInstance()
        expect(service.getLocalStorageKey()).toBe('playlist-store')
      })
    })
  })

  describe('Cross-Service Integration', () => {
    const originalWindow = globalThis.window

    beforeEach(() => {
      vi.clearAllMocks()
      PlaylistStorageService.resetInstance()
      QueueStorageService.resetInstance()
      mockStorageAPI.read.mockClear()
      mockStorageAPI.write.mockClear()
      mockStorageAPI.exists.mockClear()
      
      Object.defineProperty(globalThis, 'window', {
        value: {
          electron: {
            storage: mockStorageAPI,
          },
        },
        writable: true,
      })
    })

    afterEach(() => {
      PlaylistStorageService.resetInstance()
      QueueStorageService.resetInstance()
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
      })
    })

    it('should allow both services to operate independently', async () => {
      mockStorageAPI.read
        .mockResolvedValueOnce({ success: true, data: [mockPlaylist] })
        .mockResolvedValueOnce({ success: true, data: mockQueue })
      mockStorageAPI.write
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
      
      const playlistService = PlaylistStorageService.getInstance()
      const queueService = QueueStorageService.getInstance()
      
      const playlists = await playlistService.load()
      const queue = await queueService.load()
      
      expect(playlists).toEqual([mockPlaylist])
      expect(queue).toEqual(mockQueue)
      
      await playlistService.save([mockPlaylist])
      await queueService.save(mockQueue)
      
      expect(mockStorageAPI.write).toHaveBeenCalledTimes(2)
    })

    it('should handle failures in one service independently', async () => {
      mockStorageAPI.read
        .mockResolvedValueOnce({ success: true, data: [mockPlaylist] })
        .mockResolvedValueOnce({ success: false, error: 'Queue failed' })
      
      const playlistService = PlaylistStorageService.getInstance()
      const queueService = QueueStorageService.getInstance()
      
      const playlists = await playlistService.load()
      const queue = await queueService.load()
      
      expect(playlists).toEqual([mockPlaylist])
      expect(queue).toBeNull()
    })
  })
})

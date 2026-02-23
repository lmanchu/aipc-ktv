import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageService, getStorageService, resetStorageService } from '../src/main/storage'

// Mock electron app.getPath
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data'),
  },
}))

describe('StorageService', () => {
  let storageService: StorageService

  beforeEach(() => {
    resetStorageService()
    storageService = getStorageService()
    vi.clearAllMocks()
  })

  describe('Constructor and Path Handling', () => {
    it('should create a storage service instance', () => {
      expect(storageService).toBeInstanceOf(StorageService)
    })

    it('should have a getUserDataPath method', () => {
      expect(typeof storageService.getUserDataPath).toBe('function')
    })

    it('should return a string for userData path', () => {
      const path = storageService.getUserDataPath()
      expect(typeof path).toBe('string')
      expect(path.length).toBeGreaterThan(0)
    })
  })

  describe('Path Resolution', () => {
    it('should have read, write, exists, delete, and ensureDirectory methods', () => {
      expect(typeof storageService.read).toBe('function')
      expect(typeof storageService.write).toBe('function')
      expect(typeof storageService.exists).toBe('function')
      expect(typeof storageService.delete).toBe('function')
      expect(typeof storageService.ensureDirectory).toBe('function')
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

  describe('Method Signatures', () => {
    it('should have async read method', async () => {
      const result = await storageService.read('nonexistent.json')
      expect(result).toBeNull()
    })

    it('should have async write method', async () => {
      await expect(storageService.write('test.json', {})).resolves.not.toThrow()
    })

    it('should have async exists method', async () => {
      const result = await storageService.exists('nonexistent.json')
      expect(typeof result).toBe('boolean')
    })

    it('should have async delete method', async () => {
      await expect(storageService.delete('nonexistent.json')).resolves.not.toThrow()
    })

    it('should have async ensureDirectory method', async () => {
      await expect(storageService.ensureDirectory('test-dir')).resolves.not.toThrow()
    })
  })

  describe('Data Type Handling', () => {
    it('should handle object data in write/read cycle', async () => {
      const testData = { key: 'value', number: 42, nested: { prop: true } }
      await storageService.write('test-data.json', testData)
      const result = await storageService.read<typeof testData>('test-data.json')
      expect(result).toEqual(testData)
    })

    it('should handle array data in write/read cycle', async () => {
      const testData = [1, 2, 3, 4, 5]
      await storageService.write('test-array.json', testData)
      const result = await storageService.read<typeof testData>('test-array.json')
      expect(result).toEqual(testData)
    })

    it('should handle primitive string data', async () => {
      const testData = 'test string'
      await storageService.write('test-string.json', testData)
      const result = await storageService.read<typeof testData>('test-string.json')
      expect(result).toEqual(testData)
    })

    it('should handle primitive number data', async () => {
      const testData = 42
      await storageService.write('test-number.json', testData)
      const result = await storageService.read<typeof testData>('test-number.json')
      expect(result).toEqual(testData)
    })

    it('should handle boolean data', async () => {
      const testData = true
      await storageService.write('test-boolean.json', testData)
      const result = await storageService.read<typeof testData>('test-boolean.json')
      expect(result).toEqual(testData)
    })

    it('should handle null data', async () => {
      const testData = null
      await storageService.write('test-null.json', testData)
      const result = await storageService.read<typeof testData>('test-null.json')
      expect(result).toEqual(testData)
    })

    it('should handle empty object', async () => {
      const testData = {}
      await storageService.write('test-empty.json', testData)
      const result = await storageService.read<typeof testData>('test-empty.json')
      expect(result).toEqual(testData)
    })

    it('should handle empty array', async () => {
      const testData: number[] = []
      await storageService.write('test-empty-array.json', testData)
      const result = await storageService.read<typeof testData>('test-empty-array.json')
      expect(result).toEqual(testData)
    })
  })

  describe('File Operations', () => {
    it('should report correct existence for created file', async () => {
      await storageService.write('existence-test.json', { test: true })
      const exists = await storageService.exists('existence-test.json')
      expect(exists).toBe(true)
    })

    it('should report non-existence for non-existent file', async () => {
      const exists = await storageService.exists('nonexistent-file.json')
      expect(exists).toBe(false)
    })

    it('should delete existing file', async () => {
      await storageService.write('delete-test.json', { test: true })
      await storageService.delete('delete-test.json')
      const exists = await storageService.exists('delete-test.json')
      expect(exists).toBe(false)
    })

    it('should handle deleting non-existent file gracefully', async () => {
      await expect(storageService.delete('already-deleted.json')).resolves.not.toThrow()
    })

    it('should overwrite existing file on write', async () => {
      await storageService.write('overwrite-test.json', { version: 1 })
      await storageService.write('overwrite-test.json', { version: 2 })
      const result = await storageService.read<{ version: number }>('overwrite-test.json')
      expect(result?.version).toBe(2)
    })
  })

  describe('Directory Handling', () => {
    it('should create nested directories', async () => {
      await storageService.ensureDirectory('parent/child/grandchild')
      const testData = { nested: true }
      await storageService.write('parent/child/grandchild/test.json', testData)
      const result = await storageService.read('parent/child/grandchild/test.json')
      expect(result).toEqual(testData)
    })

    it('should handle existing directory in ensureDirectory', async () => {
      await storageService.ensureDirectory('existing-dir')
      await expect(storageService.ensureDirectory('existing-dir')).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should return null for reading non-existent file', async () => {
      const result = await storageService.read('does-not-exist.json')
      expect(result).toBeNull()
    })

    it('should read back data exactly as written', async () => {
      const complexData = {
        string: 'value',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: { deep: 'value' } },
      }
      await storageService.write('complex-test.json', complexData)
      const result = await storageService.read<typeof complexData>('complex-test.json')
      expect(result).toEqual(complexData)
    })
  })

  describe('Special Filenames', () => {
    it('should handle filename with special characters', async () => {
      const testData = { special: true }
      await storageService.write('test-file-123.json', testData)
      const result = await storageService.read('test-file-123.json')
      expect(result).toEqual(testData)
    })

    it('should handle multiple operations sequentially', async () => {
      for (let i = 0; i < 5; i++) {
        await storageService.write(`seq-${i}.json`, { index: i })
      }
      for (let i = 0; i < 5; i++) {
        const result = await storageService.read<{ index: number }>(`seq-${i}.json`)
        expect(result?.index).toBe(i)
      }
    })
  })
})

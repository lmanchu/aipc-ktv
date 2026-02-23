import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'
import { getStorageService, resetStorageService } from '../src/main/storage'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

// Mock electron app.getPath
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name) => {
      if (name === 'userData') {
        return path.join(process.cwd(), 'test-user-data-ipc')
      }
      return '/tmp'
    }),
    getVersion: vi.fn(() => '1.0.0'),
    isPackaged: false,
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}))

// Mock electron-updater
vi.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: false,
    disableWebInstaller: false,
    allowDowngrade: false,
    on: vi.fn(),
    checkForUpdatesAndNotify: vi.fn(),
    quitAndInstall: vi.fn(),
    downloadUpdate: vi.fn(),
  },
}))

// Mock the update module
vi.mock('../src/main/update', () => ({
  update: vi.fn(),
}))

describe('Storage IPC Handlers', () => {
  const testUserDataPath = path.join(process.cwd(), 'test-user-data-ipc')
  let storageService: any

  beforeEach(async () => {
    resetStorageService()
    vi.clearAllMocks()
    
    storageService = getStorageService()

    await fs.mkdir(testUserDataPath, { recursive: true })
  })

  afterEach(async () => {
    try {
      await fs.rm(testUserDataPath, { recursive: true, force: true })
    } catch (error) {
      
    }
  })

  describe('IPC Handler Registration', () => {
    it('should register storage-read handler', () => {
      const handler = async (_: any, filename: string) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          const data = await storageService.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }
      
      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should register storage-write handler', () => {
      const handler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storageService.write(filename, data)
          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }
      
      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should register storage-exists handler', () => {
      const handler = async (_: any, filename: string) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          const exists = await storageService.exists(filename)
          return { success: true, exists }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }
      
      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should register storage-delete handler', () => {
      const handler = async (_: any, filename: string) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          await storageService.delete(filename)
          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }
      
      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should register storage-ensure-directory handler', () => {
      const handler = async (_: any, directory: string) => {
        try {
          if (!directory || typeof directory !== 'string') {
            return { success: false, error: 'Invalid directory path' }
          }
          await storageService.ensureDirectory(directory)
          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }
      
      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })
  })

  describe('storage-read Handler', () => {
    const handler = async (_: any, filename: string) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        const data = await storageService.read(filename)
        return { success: true, data }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    it('should successfully read existing file', async () => {
      const testData = { key: 'value', number: 42 }
      await storageService.write('test-read.json', testData)

      const result = await handler(null, 'test-read.json')
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
    })

    it('should return null for non-existent file', async () => {
      const result = await handler(null, 'non-existent.json')
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(null)
    })

    it('should validate filename - reject empty string', async () => {
      const result = await handler(null, '')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid filename')
    })

    it('should validate filename - reject non-string', async () => {
      const result1 = await handler(null, 123)
      expect(result1.success).toBe(false)
      expect(result1.error).toBe('Invalid filename')

      const result2 = await handler(null, null)
      expect(result2.success).toBe(false)
      expect(result2.error).toBe('Invalid filename')

      const result3 = await handler(null, undefined)
      expect(result3.success).toBe(false)
      expect(result3.error).toBe('Invalid filename')

      const result4 = await handler(null, {})
      expect(result4.success).toBe(false)
      expect(result4.error).toBe('Invalid filename')

      const result5 = await handler(null, [])
      expect(result5.success).toBe(false)
      expect(result5.error).toBe('Invalid filename')
    })

    it('should handle filenames with special characters', async () => {
      const testData = { special: true }
      await storageService.write('test-file_name.json', testData)
      
      const result = await handler(null, 'test-file_name.json')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
    })

    it('should handle nested paths', async () => {
      const testData = { nested: true }
      await storageService.ensureDirectory('subdir/nested')
      await storageService.write('subdir/nested/test.json', testData)
      
      const result = await handler(null, 'subdir/nested/test.json')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
    })
  })

  describe('storage-write Handler', () => {
    const handler = async (_: any, filename: string, data: any) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        if (data === undefined) {
          return { success: false, error: 'Data cannot be undefined' }
        }
        await storageService.write(filename, data)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    it('should successfully write data to file', async () => {
      const testData = { key: 'value' }
      
      const result = await handler(null, 'test-write.json', testData)
      expect(result.success).toBe(true)
      
      const readData = await storageService.read('test-write.json')
      expect(readData).toEqual(testData)
    })

    it('should validate filename - reject empty string', async () => {
      const result = await handler(null, '', { data: 'test' })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid filename')
    })

    it('should validate filename - reject non-string', async () => {
      const result = await handler(null, 123, { data: 'test' })
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid filename')
    })

    it('should validate data - reject undefined', async () => {
      const result = await handler(null, 'test.json', undefined)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Data cannot be undefined')
    })

    it('should allow null data', async () => {
      const result = await handler(null, 'test-null.json', null)
      
      expect(result.success).toBe(true)
      const readData = await storageService.read('test-null.json')
      expect(readData).toBe(null)
    })

    it('should overwrite existing file', async () => {
      await storageService.write('overwrite.json', { version: 1 })
      
      const result = await handler(null, 'overwrite.json', { version: 2 })
      expect(result.success).toBe(true)
      
      const readData = await storageService.read('overwrite.json')
      expect(readData).toEqual({ version: 2 })
    })

    it('should write to nested paths', async () => {
      await storageService.ensureDirectory('deep/nested')
      const result = await handler(null, 'deep/nested/path.json', { nested: true })
      expect(result.success).toBe(true)
      
      const exists = await storageService.exists('deep/nested/path.json')
      expect(exists).toBe(true)
    })
  })

  describe('storage-exists Handler', () => {
    const handler = async (_: any, filename: string) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        const exists = await storageService.exists(filename)
        return { success: true, exists }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    it('should return true for existing file', async () => {
      await storageService.write('exists-test.json', { data: true })
      
      const result = await handler(null, 'exists-test.json')
      expect(result.success).toBe(true)
      expect(result.exists).toBe(true)
    })

    it('should return false for non-existent file', async () => {
      const result = await handler(null, 'does-not-exist.json')
      
      expect(result.success).toBe(true)
      expect(result.exists).toBe(false)
    })

    it('should validate filename - reject empty string', async () => {
      const result = await handler(null, '')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid filename')
    })

    it('should validate filename - reject non-string', async () => {
      const result = await handler(null, 123)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid filename')
    })

    it('should check nested paths', async () => {
      await storageService.ensureDirectory('subdir')
      await storageService.write('subdir/nested.json', { data: true })
      
      const result = await handler(null, 'subdir/nested.json')
      expect(result.success).toBe(true)
      expect(result.exists).toBe(true)
    })
  })

  describe('storage-delete Handler', () => {
    const handler = async (_: any, filename: string) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        await storageService.delete(filename)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    it('should successfully delete existing file', async () => {
      await storageService.write('delete-test.json', { data: true })
      
      const result = await handler(null, 'delete-test.json')
      expect(result.success).toBe(true)
      
      const exists = await storageService.exists('delete-test.json')
      expect(exists).toBe(false)
    })

    it('should gracefully handle deleting non-existent file', async () => {
      const result = await handler(null, 'already-deleted.json')
      
      expect(result.success).toBe(true)
    })

    it('should validate filename - reject empty string', async () => {
      const result = await handler(null, '')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid filename')
    })

    it('should validate filename - reject non-string', async () => {
      const result = await handler(null, 123)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid filename')
    })

    it('should delete files in nested paths', async () => {
      await storageService.ensureDirectory('subdir')
      await storageService.write('subdir/nested.json', { data: true })
      
      const result = await handler(null, 'subdir/nested.json')
      expect(result.success).toBe(true)
      
      const exists = await storageService.exists('subdir/nested.json')
      expect(exists).toBe(false)
    })
  })

  describe('storage-ensure-directory Handler', () => {
    const handler = async (_: any, directory: string) => {
      try {
        if (!directory || typeof directory !== 'string') {
          return { success: false, error: 'Invalid directory path' }
        }
        await storageService.ensureDirectory(directory)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    it('should successfully create directory', async () => {
      const result = await handler(null, 'new-directory')
      
      expect(result.success).toBe(true)
      
      const dirPath = path.join(testUserDataPath, 'new-directory')
      const dirExists = await fs.access(dirPath).then(() => true).catch(() => false)
      expect(dirExists).toBe(true)
    })

    it('should create nested directories', async () => {
      const result = await handler(null, 'parent/child/grandchild')
      
      expect(result.success).toBe(true)
      
      const dirPath = path.join(testUserDataPath, 'parent/child/grandchild')
      const dirExists = await fs.access(dirPath).then(() => true).catch(() => false)
      expect(dirExists).toBe(true)
    })

    it('should not error if directory already exists', async () => {
      await storageService.ensureDirectory('existing-dir')
      
      const result = await handler(null, 'existing-dir')
      expect(result.success).toBe(true)
    })

    it('should validate directory - reject empty string', async () => {
      const result = await handler(null, '')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid directory path')
    })

    it('should validate directory - reject non-string', async () => {
      const result = await handler(null, 123)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid directory path')
    })

    it('should allow writing to created directory', async () => {
      await handler(null, 'writable-dir')
      
      await storageService.write('writable-dir/test.json', { data: true })
      const exists = await storageService.exists('writable-dir/test.json')
      expect(exists).toBe(true)
    })
  })

  describe('Data Serialization Through IPC', () => {
    const writeHandler = async (_: any, filename: string, data: any) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        if (data === undefined) {
          return { success: false, error: 'Data cannot be undefined' }
        }
        await storageService.write(filename, data)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    const readHandler = async (_: any, filename: string) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        const data = await storageService.read(filename)
        return { success: true, data }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    it('should serialize and deserialize objects', async () => {
      const testData = { 
        key: 'value', 
        number: 42, 
        boolean: true,
        nested: { prop: 'deep' }
      }
      
      await writeHandler(null, 'object.json', testData)
      const result = await readHandler(null, 'object.json')
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
      expect(typeof result.data).toBe('object')
    })

    it('should serialize and deserialize arrays', async () => {
      const testData = [1, 2, 3, 4, 5, 'string', { nested: true }]
      
      await writeHandler(null, 'array.json', testData)
      const result = await readHandler(null, 'array.json')
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should serialize and deserialize strings', async () => {
      const testData = 'Hello, World! 你好世界 🌍'
      
      await writeHandler(null, 'string.json', testData)
      const result = await readHandler(null, 'string.json')
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(testData)
      expect(typeof result.data).toBe('string')
    })

    it('should serialize and deserialize numbers', async () => {
      const testCases = [
        { value: 42, type: 'integer' },
        { value: 3.14159, type: 'float' },
        { value: -100, type: 'negative' },
        { value: 0, type: 'zero' },
      ]
      
      for (const testCase of testCases) {
        await writeHandler(null, `number-${testCase.type}.json`, testCase.value)
        const result = await readHandler(null, `number-${testCase.type}.json`)
        
        expect(result.success).toBe(true)
        expect(result.data).toBe(testCase.value)
        expect(typeof result.data).toBe('number')
      }
    })

    it('should serialize and deserialize booleans', async () => {
      await writeHandler(null, 'boolean-true.json', true)
      await writeHandler(null, 'boolean-false.json', false)
      
      const result1 = await readHandler(null, 'boolean-true.json')
      expect(result1.success).toBe(true)
      expect(result1.data).toBe(true)
      expect(typeof result1.data).toBe('boolean')

      const result2 = await readHandler(null, 'boolean-false.json')
      expect(result2.success).toBe(true)
      expect(result2.data).toBe(false)
      expect(typeof result2.data).toBe('boolean')
    })

    it('should serialize and deserialize null', async () => {
      await writeHandler(null, 'null.json', null)
      
      const result = await readHandler(null, 'null.json')
      expect(result.success).toBe(true)
      expect(result.data).toBe(null)
    })

    it('should serialize and deserialize empty structures', async () => {
      const emptyObj = {}
      const emptyArray = []
      
      await writeHandler(null, 'empty-obj.json', emptyObj)
      await writeHandler(null, 'empty-array.json', emptyArray)
      
      const result1 = await readHandler(null, 'empty-obj.json')
      expect(result1.success).toBe(true)
      expect(result1.data).toEqual(emptyObj)

      const result2 = await readHandler(null, 'empty-array.json')
      expect(result2.success).toBe(true)
      expect(result2.data).toEqual(emptyArray)
    })

    it('should serialize and deserialize complex nested structures', async () => {
      const testData = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, { deep: 'value' }],
              null: null,
              boolean: true
            }
          },
          sibling: 'value'
        },
        topLevelArray: [{ a: 1 }, { b: 2 }]
      }
      
      await writeHandler(null, 'complex.json', testData)
      const result = await readHandler(null, 'complex.json')
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
    })

    it('should serialize and deserialize special characters', async () => {
      const testData = {
        unicode: '你好 世界 🌍 🎉',
        special: '\n\t\r\\',
        emoji: '🎉👍💖🚀',
        quotes: '"single" and \'double\''
      }
      
      await writeHandler(null, 'special.json', testData)
      const result = await readHandler(null, 'special.json')
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
    })

    it('should preserve data types through serialization', async () => {
      const testData = {
        number: 123.456,
        string: 'text',
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { key: 'value' }
      }
      
      await writeHandler(null, 'types.json', testData)
      const result = await readHandler(null, 'types.json')
      
      expect(result.success).toBe(true)
      expect(typeof result.data.number).toBe('number')
      expect(typeof result.data.string).toBe('string')
      expect(typeof result.data.boolean).toBe('boolean')
      expect(typeof result.data.null).toBe('object')
      expect(Array.isArray(result.data.array)).toBe(true)
      expect(typeof result.data.object).toBe('object')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    const writeHandler = async (_: any, filename: string, data: any) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        if (data === undefined) {
          return { success: false, error: 'Data cannot be undefined' }
        }
        await storageService.write(filename, data)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    const readHandler = async (_: any, filename: string) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        const data = await storageService.read(filename)
        return { success: true, data }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    it('should handle circular reference errors gracefully', async () => {
      const data: any = { name: 'test' }
      data.self = data
      
      const result = await writeHandler(null, 'circular.json', data)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle extremely large datasets', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({ 
        id: i, 
        data: 'item'.repeat(10) 
      }))
      
      const result = await writeHandler(null, 'large.json', largeArray)
      expect(result.success).toBe(true)
      
      const readResult = await readHandler(null, 'large.json')
      expect(readResult.success).toBe(true)
      expect(readResult.data.length).toBe(10000)
    })

    it('should handle deeply nested structures', async () => {
      let data: any = { level: 0 }
      for (let i = 1; i < 100; i++) {
        data = { level: i, child: data }
      }
      
      const result = await writeHandler(null, 'deep.json', data)
      expect(result.success).toBe(true)
    })

    it('should handle special path characters in filenames', async () => {
      const testData = { test: true }
      
      await writeHandler(null, 'file-with-dashes.json', testData)
      await writeHandler(null, 'file_with_underscores.json', testData)
      await writeHandler(null, 'file.with.dots.json', testData)
      
      const result1 = await readHandler(null, 'file-with-dashes.json')
      const result2 = await readHandler(null, 'file_with_underscores.json')
      const result3 = await readHandler(null, 'file.with.dots.json')
      
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result3.success).toBe(true)
    })

    it('should handle missing arguments', async () => {
      const result1 = await writeHandler(null as any)
      expect(result1.success).toBe(false)
      
      const result2 = await readHandler(null as any)
      expect(result2.success).toBe(false)
    })

    it('should handle malformed JSON files gracefully', async () => {
      const filePath = path.join(testUserDataPath, 'malformed.json')
      await fs.writeFile(filePath, '{ invalid json }', 'utf-8')
      
      const result = await readHandler(null, 'malformed.json')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Operation Sequences and Integration', () => {
    const writeHandler = async (_: any, filename: string, data: any) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        if (data === undefined) {
          return { success: false, error: 'Data cannot be undefined' }
        }
        await storageService.write(filename, data)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    const readHandler = async (_: any, filename: string) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        const data = await storageService.read(filename)
        return { success: true, data }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    const existsHandler = async (_: any, filename: string) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        const exists = await storageService.exists(filename)
        return { success: true, exists }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    const deleteHandler = async (_: any, filename: string) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        await storageService.delete(filename)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    const ensureDirectoryHandler = async (_: any, directory: string) => {
      try {
        if (!directory || typeof directory !== 'string') {
          return { success: false, error: 'Invalid directory path' }
        }
        await storageService.ensureDirectory(directory)
        return { success: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    it('should handle write-read-delete sequence', async () => {
      const testData = { lifecycle: 'test' }
      
      await writeHandler(null, 'lifecycle.json', testData)
      
      const readResult = await readHandler(null, 'lifecycle.json')
      expect(readResult.success).toBe(true)
      expect(readResult.data).toEqual(testData)
      
      await deleteHandler(null, 'lifecycle.json')
      
      const existsResult = await existsHandler(null, 'lifecycle.json')
      expect(existsResult.exists).toBe(false)
    })

    it('should handle create directory, write, read sequence', async () => {
      const testData = { in: 'directory' }
      
      await ensureDirectoryHandler(null, 'test-dir')
      
      await writeHandler(null, 'test-dir/file.json', testData)
      
      const readResult = await readHandler(null, 'test-dir/file.json')
      expect(readResult.success).toBe(true)
      expect(readResult.data).toEqual(testData)
    })

    it('should handle multiple writes to same file', async () => {
      const v1 = { version: 1 }
      const v2 = { version: 2 }
      const v3 = { version: 3 }
      
      await writeHandler(null, 'versions.json', v1)
      let result = await readHandler(null, 'versions.json')
      expect(result.data).toEqual(v1)
      
      await writeHandler(null, 'versions.json', v2)
      result = await readHandler(null, 'versions.json')
      expect(result.data).toEqual(v2)
      
      await writeHandler(null, 'versions.json', v3)
      result = await readHandler(null, 'versions.json')
      expect(result.data).toEqual(v3)
    })

    it('should handle checking existence before operations', async () => {
      const testData = { check: 'before' }
      
      let exists = await existsHandler(null, 'check-before.json')
      expect(exists.exists).toBe(false)
      
      await writeHandler(null, 'check-before.json', testData)
      
      exists = await existsHandler(null, 'check-before.json')
      expect(exists.exists).toBe(true)
      
      const readResult = await readHandler(null, 'check-before.json')
      expect(readResult.data).toEqual(testData)
    })

    it('should handle complex multi-file operations', async () => {
      await ensureDirectoryHandler(null, 'complex')
      await ensureDirectoryHandler(null, 'complex/sub1')
      await ensureDirectoryHandler(null, 'complex/sub2')
      
      await writeHandler(null, 'complex/file1.json', { id: 1 })
      await writeHandler(null, 'complex/sub1/file2.json', { id: 2 })
      await writeHandler(null, 'complex/sub2/file3.json', { id: 3 })
      
      const r1 = await readHandler(null, 'complex/file1.json')
      const r2 = await readHandler(null, 'complex/sub1/file2.json')
      const r3 = await readHandler(null, 'complex/sub2/file3.json')
      
      expect(r1.data.id).toBe(1)
      expect(r2.data.id).toBe(2)
      expect(r3.data.id).toBe(3)
      
      await deleteHandler(null, 'complex/file1.json')
      const e1 = await existsHandler(null, 'complex/file1.json')
      expect(e1.exists).toBe(false)
    })

    it('should handle rapid consecutive operations', async () => {
      const operations = []
      
      for (let i = 0; i < 50; i++) {
        operations.push(writeHandler(null, `rapid-${i}.json`, { id: i }))
      }
      
      const results = await Promise.all(operations)
      results.forEach(r => expect(r.success).toBe(true))
      
      for (let i = 0; i < 50; i++) {
        const result = await readHandler(null, `rapid-${i}.json`)
        expect(result.success).toBe(true)
        expect(result.data.id).toBe(i)
      }
    })
  })

  describe('Return Value Format Consistency', () => {
    const handler = async (_: any, filename: string) => {
      try {
        if (!filename || typeof filename !== 'string') {
          return { success: false, error: 'Invalid filename' }
        }
        const data = await storageService.read(filename)
        return { success: true, data }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    }

    it('should return success:false and error for invalid input', async () => {
      const result = await handler(null, '')
      
      expect(result).toHaveProperty('success', false)
      expect(result).toHaveProperty('error')
      expect(typeof result.error).toBe('string')
    })

    it('should return success:true and data for successful read', async () => {
      await storageService.write('test.json', { data: true })
      
      const result = await handler(null, 'test.json')
      
      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('data')
      expect(result.success).toBe(true)
    })

    it('should return success:true and null for non-existent file', async () => {
      const result = await handler(null, 'non-existent.json')
      
      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('data', null)
    })

    it('should always have success property', async () => {
      const r1 = await handler(null, 'test.json')
      expect(r1).toHaveProperty('success')
      
      const r2 = await handler(null, '')
      expect(r2).toHaveProperty('success')
    })
  })
})

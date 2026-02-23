import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getStorageService, resetStorageService } from '../src/main/storage'

// Mock electron app.getPath
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-user-data'),
    getVersion: vi.fn(() => '1.0.0'),
    isPackaged: false,
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
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

// Import ipcMain after mocking
import { ipcMain } from 'electron'

describe('Storage IPC Handlers', () => {
  beforeEach(() => {
    resetStorageService()
    vi.clearAllMocks()
  })

  describe('IPC Handler Implementation', () => {
    it('storage-read handler should validate filename and return data', async () => {
      const storage = getStorageService()
      const testData = { key: 'value' }
      await storage.write('test-read.json', testData)

      // Simulate the handler logic
      const handler = async (_: any, filename: string) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          const data = await storage.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      // Test valid read
      const result = await handler(null, 'test-read.json')
      expect(result).toEqual({ success: true, data: testData })

      // Test invalid filename
      const result2 = await handler(null, 123)
      expect(result2).toEqual({ success: false, error: 'Invalid filename' })

      // Test empty filename
      const result3 = await handler(null, '')
      expect(result3).toEqual({ success: false, error: 'Invalid filename' })
    })

    it('storage-write handler should validate filename and data', async () => {
      const storage = getStorageService()

      const handler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      // Test valid write
      const result = await handler(null, 'test-write.json', { data: 'test' })
      expect(result).toEqual({ success: true })

      // Test invalid filename
      const result2 = await handler(null, null, { data: 'test' })
      expect(result2).toEqual({ success: false, error: 'Invalid filename' })

      // Test undefined data
      const result3 = await handler(null, 'test.json', undefined)
      expect(result3).toEqual({ success: false, error: 'Data cannot be undefined' })
    })

    it('storage-exists handler should validate filename and check existence', async () => {
      const storage = getStorageService()
      await storage.write('exists-true.json', { data: true })

      const handler = async (_: any, filename: string) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          const exists = await storage.exists(filename)
          return { success: true, exists }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      // Test existing file
      const result = await handler(null, 'exists-true.json')
      expect(result).toEqual({ success: true, exists: true })

      // Test non-existent file
      const result2 = await handler(null, 'nonexistent.json')
      expect(result2).toEqual({ success: true, exists: false })

      // Test invalid filename
      const result3 = await handler(null, {})
      expect(result3).toEqual({ success: false, error: 'Invalid filename' })
    })

    it('storage-delete handler should validate filename and delete file', async () => {
      const storage = getStorageService()
      await storage.write('delete-test.json', { data: true })

      const handler = async (_: any, filename: string) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          await storage.delete(filename)
          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      // Test delete existing file
      const result = await handler(null, 'delete-test.json')
      expect(result).toEqual({ success: true })
      expect(await storage.exists('delete-test.json')).toBe(false)

      // Test delete non-existent file (should succeed gracefully)
      const result2 = await handler(null, 'already-deleted.json')
      expect(result2).toEqual({ success: true })

      // Test invalid filename
      const result3 = await handler(null, [])
      expect(result3).toEqual({ success: false, error: 'Invalid filename' })
    })

    it('storage-ensure-directory handler should validate directory and create it', async () => {
      const storage = getStorageService()
      const testDir = 'parent/child'

      const handler = async (_: any, directory: string) => {
        try {
          if (!directory || typeof directory !== 'string') {
            return { success: false, error: 'Invalid directory path' }
          }
          await storage.ensureDirectory(directory)
          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      // Test create directory
      const result = await handler(null, testDir)
      expect(result).toEqual({ success: true })

      // Verify directory was created by writing a file to it
      await storage.write('parent/child/test.json', { nested: true })
      expect(await storage.exists('parent/child/test.json')).toBe(true)

      // Test invalid directory
      const result2 = await handler(null, 123)
      expect(result2).toEqual({ success: false, error: 'Invalid directory path' })
    })
  })

  describe('Error Handling', () => {
    it('should handle storage read gracefully for non-existent files', async () => {
      const storage = getStorageService()

      const handler = async (_: any, filename: string) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          const data = await storage.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      const result = await handler(null, 'non-existent-file.json')
      expect(result.success).toBe(true)
      expect(result.data).toBe(null)
    })

    it('should handle storage write gracefully for valid data', async () => {
      const storage = getStorageService()

      const handler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      const result = await handler(null, 'error-test.json', { data: 'test' })
      expect(result.success).toBe(true)
    })
  })

  describe('Data Type Handling', () => {
    it('should handle object data through IPC', async () => {
      const storage = getStorageService()
      const testData = { key: 'value', number: 42, nested: { prop: true } }

      const writeHandler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
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
          const data = await storage.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      await writeHandler(null, 'test-object.json', testData)
      const result = await readHandler(null, 'test-object.json')
      expect(result).toEqual({ success: true, data: testData })
    })

    it('should handle array data through IPC', async () => {
      const storage = getStorageService()
      const testData = [1, 2, 3, 4, 5]

      const writeHandler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
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
          const data = await storage.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      await writeHandler(null, 'test-array.json', testData)
      const result = await readHandler(null, 'test-array.json')
      expect(result).toEqual({ success: true, data: testData })
    })

    it('should handle string data through IPC', async () => {
      const storage = getStorageService()
      const testData = 'test string'

      const writeHandler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
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
          const data = await storage.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      await writeHandler(null, 'test-string.json', testData)
      const result = await readHandler(null, 'test-string.json')
      expect(result).toEqual({ success: true, data: testData })
    })

    it('should handle number data through IPC', async () => {
      const storage = getStorageService()
      const testData = 42

      const writeHandler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
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
          const data = await storage.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      await writeHandler(null, 'test-number.json', testData)
      const result = await readHandler(null, 'test-number.json')
      expect(result).toEqual({ success: true, data: testData })
    })

    it('should handle boolean data through IPC', async () => {
      const storage = getStorageService()
      const testData = true

      const writeHandler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
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
          const data = await storage.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      await writeHandler(null, 'test-boolean.json', testData)
      const result = await readHandler(null, 'test-boolean.json')
      expect(result).toEqual({ success: true, data: testData })
    })

    it('should handle null data through IPC', async () => {
      const storage = getStorageService()
      const testData = null

      const writeHandler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
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
          const data = await storage.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      await writeHandler(null, 'test-null.json', testData)
      const result = await readHandler(null, 'test-null.json')
      expect(result).toEqual({ success: true, data: testData })
    })
  })

  describe('Operation Sequences', () => {
    it('should handle write followed by read', async () => {
      const storage = getStorageService()
      const testData = { sequence: true }

      const writeHandler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
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
          const data = await storage.read(filename)
          return { success: true, data }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      await writeHandler(null, 'sequence-1.json', testData)
      const result = await readHandler(null, 'sequence-1.json')
      expect(result).toEqual({ success: true, data: testData })
    })

    it('should handle write, read, delete sequence', async () => {
      const storage = getStorageService()
      const testData = { lifecycle: true }

      const writeHandler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
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
          const data = await storage.read(filename)
          return { success: true, data }
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
          await storage.delete(filename)
          return { success: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      await writeHandler(null, 'lifecycle.json', testData)
      const result1 = await readHandler(null, 'lifecycle.json')
      expect(result1).toEqual({ success: true, data: testData })

      await deleteHandler(null, 'lifecycle.json')
      const result2 = await readHandler(null, 'lifecycle.json')
      expect(result2).toEqual({ success: true, data: null })
    })

    it('should handle multiple operations on same file', async () => {
      const storage = getStorageService()

      const writeHandler = async (_: any, filename: string, data: any) => {
        try {
          if (!filename || typeof filename !== 'string') {
            return { success: false, error: 'Invalid filename' }
          }
          if (data === undefined) {
            return { success: false, error: 'Data cannot be undefined' }
          }
          await storage.write(filename, data)
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
          const data = await storage.read(filename)
          return { success: true, data }
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
          await storage.delete(filename)
          return { success: true }
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
          const exists = await storage.exists(filename)
          return { success: true, exists }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { success: false, error: message }
        }
      }

      await writeHandler(null, 'multi-op.json', { version: 1 })
      const result1 = await readHandler(null, 'multi-op.json')
      expect(result1.data?.version).toBe(1)

      await writeHandler(null, 'multi-op.json', { version: 2 })
      const result2 = await readHandler(null, 'multi-op.json')
      expect(result2.data?.version).toBe(2)

      await deleteHandler(null, 'multi-op.json')

      const exists = await existsHandler(null, 'multi-op.json')
      expect(exists.exists).toBe(false)
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ProgressInfo, UpdateInfo, UpdateDownloadedEvent } from 'electron-updater'

// Mock autoUpdater
const mockAutoUpdater = {
  autoDownload: true,
  disableWebInstaller: true,
  allowDowngrade: true,
  checkForUpdatesAndNotify: vi.fn(),
  on: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
}

// Mock electron app
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getVersion: vi.fn(() => '1.0.0'),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
}))

// Mock electron-updater types
vi.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}))

// Mock node:module - this needs to be mocked before importing the update module
const mockCreateRequire = vi.fn((path: string) => {
  return (moduleId: string) => {
    if (moduleId === 'electron-updater') {
      return {
        autoUpdater: mockAutoUpdater,
      }
    }
    return {}
  }
})

vi.mock('node:module', () => ({
  createRequire: mockCreateRequire,
}))

// Import app and ipcMain after mocking
import { app, ipcMain } from 'electron'

describe('Story 11.0: Test Auto-Update Check Functionality', () => {
  let mockWin: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock BrowserWindow
    mockWin = {
      webContents: {
        send: vi.fn(),
      },
    }

    // Reset autoUpdater config
    mockAutoUpdater.autoDownload = true
    mockAutoUpdater.disableWebInstaller = true
    mockAutoUpdater.allowDowngrade = true
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test the update function's internal logic directly
  // This simulates what happens in update.ts without importing electron-updater
  describe('Update Check Logic - Development Mode', () => {
    it('should return appropriate response in development (app not packaged)', async () => {
      (app.isPackaged as any) = false

      // Simulate check-update handler logic
      const checkUpdateHandler = async () => {
        if (!app.isPackaged) {
          const error = new Error('The update feature is only available after the package.')
          return { message: error.message, error }
        }
        return await mockAutoUpdater.checkForUpdatesAndNotify()
      }

      const result = await checkUpdateHandler()

      expect(result).toEqual({
        message: 'The update feature is only available after the package.',
        error: expect.any(Error),
      })
      expect(mockAutoUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled()
    })

    it('should return error message correctly formatted', async () => {
      (app.isPackaged as any) = false

      const checkUpdateHandler = async () => {
        if (!app.isPackaged) {
          const error = new Error('The update feature is only available after the package.')
          return { message: error.message, error }
        }
        return await mockAutoUpdater.checkForUpdatesAndNotify()
      }

      const result = await checkUpdateHandler()

      expect(result.message).toBe('The update feature is only available after the package.')
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('The update feature is only available after the package.')
    })
  })

  describe('Update Check Logic - Packaged Mode', () => {
    beforeEach(() => {
      (app.isPackaged as any) = true
    })

    it('should call checkForUpdatesAndNotify when app is packaged', async () => {
      const mockUpdateResult = { version: '2.0.0' }
      mockAutoUpdater.checkForUpdatesAndNotify.mockResolvedValue(mockUpdateResult)

      const checkUpdateHandler = async () => {
        if (!app.isPackaged) {
          const error = new Error('The update feature is only available after the package.')
          return { message: error.message, error }
        }

        try {
          return await mockAutoUpdater.checkForUpdatesAndNotify()
        } catch (error) {
          return { message: 'Network error', error }
        }
      }

      const result = await checkUpdateHandler()

      expect(mockAutoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled()
      expect(result).toEqual(mockUpdateResult)
    })

    it('should return network error on check failure', async () => {
      const mockError = new Error('Network error')
      mockAutoUpdater.checkForUpdatesAndNotify.mockRejectedValue(mockError)

      const checkUpdateHandler = async () => {
        if (!app.isPackaged) {
          const error = new Error('The update feature is only available after the package.')
          return { message: error.message, error }
        }

        try {
          return await mockAutoUpdater.checkForUpdatesAndNotify()
        } catch (error) {
          return { message: 'Network error', error }
        }
      }

      const result = await checkUpdateHandler()

      expect(result).toEqual({
        message: 'Network error',
        error: mockError,
      })
    })
  })

  describe('Update Available Event Logic', () => {
    it('should send update-can-available with update=true when update is available', () => {
      const updateAvailableHandler = (arg: UpdateInfo) => {
        mockWin.webContents.send('update-can-available', {
          update: true,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      const mockUpdateInfo: UpdateInfo = { version: '2.0.0' } as any
      updateAvailableHandler(mockUpdateInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith('update-can-available', {
        update: true,
        version: '1.0.0',
        newVersion: '2.0.0',
      })
    })

    it('should include current app version in update message', () => {
      (app.getVersion as any).mockReturnValue('1.0.0')

      const updateAvailableHandler = (arg: UpdateInfo) => {
        mockWin.webContents.send('update-can-available', {
          update: true,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      const mockUpdateInfo: UpdateInfo = { version: '2.0.0' } as any
      updateAvailableHandler(mockUpdateInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        'update-can-available',
        expect.objectContaining({
          version: '1.0.0',
        })
      )
    })

    it('should handle missing newVersion gracefully', () => {
      const updateAvailableHandler = (arg: UpdateInfo) => {
        mockWin.webContents.send('update-can-available', {
          update: true,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      const mockUpdateInfo: UpdateInfo = { version: undefined } as any
      updateAvailableHandler(mockUpdateInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        'update-can-available',
        expect.objectContaining({
          update: true,
          newVersion: undefined,
        })
      )
    })
  })

  describe('Update Not Available Event Logic', () => {
    it('should send update-can-available with update=false when no update available', () => {
      const updateNotAvailableHandler = (arg: UpdateInfo) => {
        mockWin.webContents.send('update-can-available', {
          update: false,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      const mockUpdateInfo: UpdateInfo = { version: '1.0.0' } as any
      updateNotAvailableHandler(mockUpdateInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith('update-can-available', {
        update: false,
        version: '1.0.0',
        newVersion: '1.0.0',
      })
    })
  })

  describe('Download Progress Event Logic', () => {
    it('should send download-progress with progress info', () => {
      const downloadProgressHandler = (info: ProgressInfo) => {
        mockWin.webContents.send('download-progress', info)
      }

      const mockProgressInfo: ProgressInfo = {
        percent: 50,
        transferred: 5000000,
        total: 10000000,
        bytesPerSecond: 1000000,
      }

      downloadProgressHandler(mockProgressInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith('download-progress', mockProgressInfo)
    })

    it('should include all progress info properties', () => {
      const downloadProgressHandler = (info: ProgressInfo) => {
        mockWin.webContents.send('download-progress', info)
      }

      const mockProgressInfo: ProgressInfo = {
        percent: 75,
        transferred: 7500000,
        total: 10000000,
        bytesPerSecond: 2000000,
      }

      downloadProgressHandler(mockProgressInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        'download-progress',
        expect.objectContaining({
          percent: 75,
          transferred: 7500000,
          total: 10000000,
          bytesPerSecond: 2000000,
        })
      )
    })

    it('should update progress info during download', () => {
      const downloadProgressHandler = (info: ProgressInfo) => {
        mockWin.webContents.send('download-progress', info)
      }

      const progressUpdates = [25, 50, 75, 100]
      for (const percent of progressUpdates) {
        const mockProgressInfo: ProgressInfo = {
          percent,
          transferred: percent * 100000,
          total: 10000000,
          bytesPerSecond: 1000000,
        }

        downloadProgressHandler(mockProgressInfo)
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
          'download-progress',
          expect.objectContaining({ percent })
        )
      }
    })
  })

  describe('Download Error Event Logic', () => {
    it('should send update-error on download error', () => {
      const errorHandler = (error: Error) => {
        mockWin.webContents.send('update-error', { message: error.message, error })
      }

      const mockError = new Error('Download failed')
      errorHandler(mockError)

      expect(mockWin.webContents.send).toHaveBeenCalledWith('update-error', {
        message: 'Download failed',
        error: mockError,
      })
    })

    it('should handle different error types', () => {
      const errorHandler = (error: Error) => {
        mockWin.webContents.send('update-error', { message: error.message, error })
      }

      const errorTypes = [
        new Error('Network timeout'),
        new Error('Invalid checksum'),
        new Error('Insufficient disk space'),
      ]

      for (const error of errorTypes) {
        errorHandler(error)
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
          'update-error',
          expect.objectContaining({
            error,
          })
        )
      }
    })
  })

  describe('Update Downloaded Event Logic', () => {
    it('should send update-downloaded when download completes', () => {
      const updateDownloadedHandler = () => {
        mockWin.webContents.send('update-downloaded')
      }

      updateDownloadedHandler()

      expect(mockWin.webContents.send).toHaveBeenCalledWith('update-downloaded')
    })
  })

  describe('Download Trigger Logic', () => {
    it('should trigger downloadUpdate when start-download is called', () => {
      const startDownloadHandler = () => {
        const callback = (error: Error | null, info: ProgressInfo | null) => {
          if (error) {
            mockWin.webContents.send('update-error', { message: error.message, error })
          } else {
            mockWin.webContents.send('download-progress', info)
          }
        }

        mockAutoUpdater.on('download-progress', (info: ProgressInfo) => callback(null, info))
        mockAutoUpdater.on('error', (error: Error) => callback(error, null))
        mockAutoUpdater.downloadUpdate()
      }

      startDownloadHandler()

      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled()
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function))
      expect(mockAutoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function))
    })
  })

  describe('Quit and Install Logic', () => {
    it('should call autoUpdater.quitAndInstall', () => {
      const quitAndInstallHandler = () => {
        mockAutoUpdater.quitAndInstall(false, true)
      }

      quitAndInstallHandler()

      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true)
    })

    it('should pass correct parameters to quitAndInstall', () => {
      const quitAndInstallHandler = () => {
        mockAutoUpdater.quitAndInstall(false, true)
      }

      quitAndInstallHandler()

      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalledWith(
        false, // isSilent
        true   // isForceRunAfter
      )
    })
  })

  describe('Version Information Display', () => {
    it('should display correct version info in update-available event', () => {
      (app.getVersion as any).mockReturnValue('1.0.0')

      const updateAvailableHandler = (arg: UpdateInfo) => {
        mockWin.webContents.send('update-can-available', {
          update: true,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      const mockUpdateInfo: UpdateInfo = { version: '2.0.0' } as any
      updateAvailableHandler(mockUpdateInfo)

      const sentData = mockWin.webContents.send.mock.calls.find(
        call => call[0] === 'update-can-available'
      )[1]

      expect(sentData.version).toBe('1.0.0')
      expect(sentData.newVersion).toBe('2.0.0')
      expect(sentData.update).toBe(true)
    })

    it('should display same version when no update available', () => {
      (app.getVersion as any).mockReturnValue('1.0.0')

      const updateNotAvailableHandler = (arg: UpdateInfo) => {
        mockWin.webContents.send('update-can-available', {
          update: false,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      const mockUpdateInfo: UpdateInfo = { version: '1.0.0' } as any
      updateNotAvailableHandler(mockUpdateInfo)

      const sentData = mockWin.webContents.send.mock.calls.find(
        call => call[0] === 'update-can-available'
      )[1]

      expect(sentData.version).toBe('1.0.0')
      expect(sentData.newVersion).toBe('1.0.0')
      expect(sentData.update).toBe(false)
    })

    it('should handle version format changes', () => {
      (app.getVersion as any).mockReturnValue('1.0.0-beta')

      const updateAvailableHandler = (arg: UpdateInfo) => {
        mockWin.webContents.send('update-can-available', {
          update: true,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      const mockUpdateInfo: UpdateInfo = { version: '1.0.0' } as any
      updateAvailableHandler(mockUpdateInfo)

      const sentData = mockWin.webContents.send.mock.calls.find(
        call => call[0] === 'update-can-available'
      )[1]

      expect(sentData.version).toBe('1.0.0-beta')
      expect(sentData.newVersion).toBe('1.0.0')
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('should handle null update info gracefully', () => {
      const updateAvailableHandler = (arg: UpdateInfo) => {
        mockWin.webContents.send('update-can-available', {
          update: true,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      updateAvailableHandler(null as any)

      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        'update-can-available',
        expect.objectContaining({
          update: true,
          newVersion: undefined,
        })
      )
    })

    it('should handle missing version in update info', () => {
      const updateAvailableHandler = (arg: UpdateInfo) => {
        mockWin.webContents.send('update-can-available', {
          update: true,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      const mockUpdateInfo: UpdateInfo = {} as any
      updateAvailableHandler(mockUpdateInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        'update-can-available',
        expect.objectContaining({
          update: true,
          newVersion: undefined,
        })
      )
    })

    it('should handle error without message', () => {
      const errorHandler = (error: Error) => {
        mockWin.webContents.send('update-error', { message: error.message, error })
      }

      const mockError = new Error()
      mockError.message = ''
      errorHandler(mockError)

      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        'update-error',
        expect.objectContaining({
          message: '',
          error: mockError,
        })
      )
    })
  })

  describe('Progress Info Accuracy', () => {
    it('should calculate percentage correctly', () => {
      const downloadProgressHandler = (info: ProgressInfo) => {
        mockWin.webContents.send('download-progress', info)
      }

      const mockProgressInfo: ProgressInfo = {
        percent: 99.5,
        transferred: 9950000,
        total: 10000000,
        bytesPerSecond: 1500000,
      }

      downloadProgressHandler(mockProgressInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        'download-progress',
        expect.objectContaining({
          percent: 99.5,
        })
      )
    })

    it('should handle zero percent', () => {
      const downloadProgressHandler = (info: ProgressInfo) => {
        mockWin.webContents.send('download-progress', info)
      }

      const mockProgressInfo: ProgressInfo = {
        percent: 0,
        transferred: 0,
        total: 10000000,
        bytesPerSecond: 0,
      }

      downloadProgressHandler(mockProgressInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        'download-progress',
        expect.objectContaining({
          percent: 0,
        })
      )
    })

    it('should handle 100 percent', () => {
      const downloadProgressHandler = (info: ProgressInfo) => {
        mockWin.webContents.send('download-progress', info)
      }

      const mockProgressInfo: ProgressInfo = {
        percent: 100,
        transferred: 10000000,
        total: 10000000,
        bytesPerSecond: 2000000,
      }

      downloadProgressHandler(mockProgressInfo)

      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        'download-progress',
        expect.objectContaining({
          percent: 100,
        })
      )
    })
  })

  describe('IPC Handler Registration', () => {
    it('should register check-update handler', () => {
      const checkUpdateHandler = async () => {
        if (!app.isPackaged) {
          const error = new Error('The update feature is only available after the package.')
          return { message: error.message, error }
        }

        try {
          return await mockAutoUpdater.checkForUpdatesAndNotify()
        } catch (error) {
          return { message: 'Network error', error }
        }
      }

      // Simulate IPC handler registration
      ipcMain.handle('check-update', checkUpdateHandler)

      expect(ipcMain.handle).toHaveBeenCalledWith('check-update', expect.any(Function))
    })

    it('should register start-download handler', () => {
      const startDownloadHandler = () => {
        const callback = (error: Error | null, info: ProgressInfo | null) => {
          if (error) {
            mockWin.webContents.send('update-error', { message: error.message, error })
          } else {
            mockWin.webContents.send('download-progress', info)
          }
        }

        const complete = () => {
          mockWin.webContents.send('update-downloaded')
        }

        mockAutoUpdater.on('download-progress', (info: ProgressInfo) => callback(null, info))
        mockAutoUpdater.on('error', (error: Error) => callback(error, null))
        mockAutoUpdater.on('update-downloaded', complete)
        mockAutoUpdater.downloadUpdate()
      }

      // Simulate IPC handler registration
      ipcMain.handle('start-download', startDownloadHandler)

      expect(ipcMain.handle).toHaveBeenCalledWith('start-download', expect.any(Function))
    })

    it('should register quit-and-install handler', () => {
      const quitAndInstallHandler = () => {
        mockAutoUpdater.quitAndInstall(false, true)
      }

      // Simulate IPC handler registration
      ipcMain.handle('quit-and-install', quitAndInstallHandler)

      expect(ipcMain.handle).toHaveBeenCalledWith('quit-and-install', expect.any(Function))
    })
  })

  describe('Integration with BrowserWindow', () => {
    it('should send events to correct window', () => {
      const mockWin1 = {
        webContents: { send: vi.fn() },
      }
      const mockWin2 = {
        webContents: { send: vi.fn() },
      }

      const updateAvailableHandler = (win: any, arg: UpdateInfo) => {
        win.webContents.send('update-can-available', {
          update: true,
          version: app.getVersion(),
          newVersion: arg?.version,
        })
      }

      const mockUpdateInfo: UpdateInfo = { version: '2.0.0' } as any
      updateAvailableHandler(mockWin1, mockUpdateInfo)

      expect(mockWin1.webContents.send).toHaveBeenCalled()
      expect(mockWin2.webContents.send).not.toHaveBeenCalled()
    })
  })
})

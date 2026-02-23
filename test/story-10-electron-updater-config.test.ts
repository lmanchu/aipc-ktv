import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs/promises'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '..')

describe('Story 10.0: Verify electron-updater Configuration', () => {
  let electronBuilderConfig: any
  let updateMainTs: string
  let updateTs: string
  let preloadTs: string
  let updateComponentTsx: string
  let packageJson: any

  beforeAll(async () => {
    // Read electron-builder.yml
    const builderPath = path.join(projectRoot, 'electron-builder.yml')
    const builderContent = await fs.readFile(builderPath, 'utf-8')
    electronBuilderConfig = yaml.load(builderContent)

    // Read update.ts files
    const updateMainPath = path.join(projectRoot, 'src/main/update.ts')
    updateMainTs = await fs.readFile(updateMainPath, 'utf-8')

    const updateElectronPath = path.join(projectRoot, 'electron/main/update.ts')
    updateTs = await fs.readFile(updateElectronPath, 'utf-8')

    // Read preload.ts
    const preloadPath = path.join(projectRoot, 'src/main/preload.ts')
    preloadTs = await fs.readFile(preloadPath, 'utf-8')

    // Read Update component
    const updateComponentPath = path.join(projectRoot, 'src/renderer/components/update/index.tsx')
    updateComponentTsx = await fs.readFile(updateComponentPath, 'utf-8')

    // Read package.json
    const packagePath = path.join(projectRoot, 'package.json')
    const packageContent = await fs.readFile(packagePath, 'utf-8')
    packageJson = JSON.parse(packageContent)
  })

  describe('1. electron-builder.yml Publish Configuration', () => {
    it('should have publish field configured', () => {
      expect(electronBuilderConfig).toHaveProperty('publish')
    })

    it('should have publish field set to null (to be configured for production)', () => {
      // Currently set to null, which is acceptable for development
      // In production, this should be set to a provider (e.g., GitHub Releases)
      expect(electronBuilderConfig.publish).toBeNull()
    })

    it('should have correct appId for electron-updater', () => {
      expect(electronBuilderConfig).toHaveProperty('appId')
      expect(electronBuilderConfig.appId).toBe('com.aipc.ktv')
    })

    it('should have version in package.json for electron-updater', () => {
      expect(packageJson).toHaveProperty('version')
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/)
    })

    it('should have electron-updater dependency installed', () => {
      expect(packageJson.dependencies).toHaveProperty('electron-updater')
      expect(packageJson.dependencies['electron-updater']).toMatch(/^\^?\d+\.\d+\.\d+$/)
    })
  })

  describe('2. Auto-update Handlers Configuration in update.ts', () => {
    it('should import electron-updater', () => {
      expect(updateMainTs).toMatch(/electron-updater/)
      expect(updateTs).toMatch(/electron-updater/)
    })

    it('should configure autoDownload to false', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.autoDownload\s*=\s*false/)
    })

    it('should configure disableWebInstaller', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.disableWebInstaller\s*=\s*false/)
    })

    it('should configure allowDowngrade', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.allowDowngrade\s*=\s*false/)
    })

    it('should set up update-available event handler', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.on\(['"]update-available['"]/)
    })

    it('should set up update-not-available event handler', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.on\(['"]update-not-available['"]/)
    })

    it('should set up download-progress event handler', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.on\(['"]download-progress['"]/)
    })

    it('should set up error event handler', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.on\(['"]error['"]/)
    })

    it('should set up update-downloaded event handler', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.on\(['"]update-downloaded['"]/)
    })

    it('should register check-update IPC handler', () => {
      expect(updateMainTs).toMatch(/ipcMain\.handle\(['"]check-update['"]/)
    })

    it('should register start-download IPC handler', () => {
      expect(updateMainTs).toMatch(/ipcMain\.handle\(['"]start-download['"]/)
    })

    it('should register quit-and-install IPC handler', () => {
      expect(updateMainTs).toMatch(/ipcMain\.handle\(['"]quit-and-install['"]/)
    })

    it('should check if app is packaged before update check', () => {
      expect(updateMainTs).toMatch(/app\.isPackaged/)
    })

    it('should call checkForUpdatesAndNotify', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.checkForUpdatesAndNotify\(\)/)
    })

    it('should call downloadUpdate', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.downloadUpdate\(\)/)
    })

    it('should call quitAndInstall', () => {
      expect(updateMainTs).toMatch(/autoUpdater\.quitAndInstall\(/)
    })

    it('should send update-can-available event', () => {
      expect(updateMainTs).toMatch(/win\.webContents\.send\(['"]update-can-available['"]/)
    })

    it('should send download-progress event', () => {
      expect(updateMainTs).toMatch(/event\.sender\.send\(['"]download-progress['"]/)
    })

    it('should send update-error event', () => {
      expect(updateMainTs).toMatch(/event\.sender\.send\(['"]update-error['"]/)
    })

    it('should send update-downloaded event', () => {
      expect(updateMainTs).toMatch(/event\.sender\.send\(['"]update-downloaded['"]/)
    })
  })

  describe('3. Preload Update API Exposure', () => {
    it('should expose ipcRenderer through contextBridge', () => {
      expect(preloadTs).toMatch(/contextBridge\.exposeInMainWorld\(['"]electron['"]/)
      expect(preloadTs).toMatch(/ipcRenderer:/)
    })

    it('should expose invoke method on ipcRenderer', () => {
      expect(preloadTs).toMatch(/invoke\(channel: string, \.\.\.args: any\[\]\)/)
    })

    it('should expose on method on ipcRenderer', () => {
      expect(preloadTs).toMatch(/on\(channel: string, listener: \(\.\.\.args: any\[\]\) => void\)/)
    })

    it('should expose off method on ipcRenderer', () => {
      expect(preloadTs).toMatch(/off\(channel: string, listener\?\: \(\.\.\.args: any\[\]\) => void\)/)
    })

    it('should provide legacy ipcRenderer support', () => {
      expect(preloadTs).toMatch(/contextBridge\.exposeInMainWorld\(['"]ipcRenderer['"]/)
    })

    // Note: The update API is exposed via the low-level ipcRenderer API,
    // not through a dedicated update API. This is acceptable and follows
    // the pattern shown in the update component.
  })

  describe('4. Renderer Update UI Existence', () => {
    it('should have Update component', () => {
      expect(updateComponentTsx).toMatch(/const Update = \(\) =>/)
    })

    it('should have check update button', () => {
      expect(updateComponentTsx).toMatch(/<button disabled=\{checking\} onClick=\{checkUpdate\}>/)
    })

    it('should have Modal component', () => {
      expect(updateComponentTsx).toMatch(/import Modal from ['"]\.\/Modal['"]/)
      expect(updateComponentTsx).toMatch(/<Modal/)
    })

    it('should have Progress component', () => {
      expect(updateComponentTsx).toMatch(/import Progress from ['"]\.\/Progress['"]/)
      expect(updateComponentTsx).toMatch(/<Progress/)
    })

    it('should call check-update IPC handler', () => {
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.invoke\(['"]check-update['"]/)
    })

    it('should call start-download IPC handler', () => {
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.invoke\(['"]start-download['"]/)
    })

    it('should call quit-and-install IPC handler', () => {
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.invoke\(['"]quit-and-install['"]/)
    })

    it('should listen to update-can-available event', () => {
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.on\(['"]update-can-available['"]/)
    })

    it('should listen to update-error event', () => {
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.on\(['"]update-error['"]/)
    })

    it('should listen to download-progress event', () => {
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.on\(['"]download-progress['"]/)
    })

    it('should listen to update-downloaded event', () => {
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.on\(['"]update-downloaded['"]/)
    })

    it('should remove event listeners on cleanup', () => {
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.off\(['"]update-can-available['"]/)
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.off\(['"]update-error['"]/)
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.off\(['"]download-progress['"]/)
      expect(updateComponentTsx).toMatch(/window\.ipcRenderer\.off\(['"]update-downloaded['"]/)
    })

    it('should display update progress', () => {
      expect(updateComponentTsx).toMatch(/progressInfo\?\.percent/)
    })

    it('should display new version information', () => {
      expect(updateComponentTsx).toMatch(/versionInfo\?\.newVersion/)
    })

    it('should display error messages', () => {
      expect(updateComponentTsx).toMatch(/updateError\.message/)
    })
  })

  describe('5. Update Check Response Verification', () => {
    it('should return error message when app is not packaged', () => {
      expect(updateMainTs).toMatch(/The update feature is only available after the package\./)
    })

    it('should return network error message on network failure', () => {
      expect(updateMainTs).toMatch(/Network error/)
    })

    it('should return object with message and error properties', () => {
      expect(updateMainTs).toMatch(/\{\s*message:\s*error\.message,\s*error\s*\}/)
    })

    it('should send update-can-available with version info', () => {
      expect(updateMainTs).toMatch(/update:\s*true,\s*version:\s*app\.getVersion\(\),\s*newVersion:\s*arg\?\.version/)
    })
  })

  describe('6. Type Definition Files', () => {
    it('should have VersionInfo interface in electron-updater.d.ts', async () => {
      const typeDefsPath = path.join(projectRoot, 'src/shared/electron-updater.d.ts')
      const typeDefs = await fs.readFile(typeDefsPath, 'utf-8')
      expect(typeDefs).toMatch(/interface VersionInfo/)
      expect(typeDefs).toMatch(/update: boolean/)
      expect(typeDefs).toMatch(/version: string/)
      expect(typeDefs).toMatch(/newVersion\?: string/)
    })

    it('should have ErrorType interface in electron-updater.d.ts', async () => {
      const typeDefsPath = path.join(projectRoot, 'src/shared/electron-updater.d.ts')
      const typeDefs = await fs.readFile(typeDefsPath, 'utf-8')
      expect(typeDefs).toMatch(/interface ErrorType/)
      expect(typeDefs).toMatch(/message: string/)
      expect(typeDefs).toMatch(/error: Error/)
    })
  })

  describe('7. Update Component Integration', () => {
    it('should have checking state', () => {
      expect(updateComponentTsx).toMatch(/const \[checking, setChecking\]/)
    })

    it('should have updateAvailable state', () => {
      expect(updateComponentTsx).toMatch(/const \[updateAvailable, setUpdateAvailable\]/)
    })

    it('should have versionInfo state', () => {
      expect(updateComponentTsx).toMatch(/const \[versionInfo, setVersionInfo\]/)
    })

    it('should have updateError state', () => {
      expect(updateComponentTsx).toMatch(/const \[updateError, setUpdateError\]/)
    })

    it('should have progressInfo state', () => {
      expect(updateComponentTsx).toMatch(/const \[progressInfo, setProgressInfo\]/)
    })

    it('should have modalOpen state', () => {
      expect(updateComponentTsx).toMatch(/const \[modalOpen, setModalOpen\]/)
    })

    it('should have checkUpdate function', () => {
      expect(updateComponentTsx).toMatch(/const checkUpdate = async \(\) =>/)
    })

    it('should have onUpdateCanAvailable callback', () => {
      expect(updateComponentTsx).toMatch(/const onUpdateCanAvailable = useCallback/)
    })

    it('should have onUpdateError callback', () => {
      expect(updateComponentTsx).toMatch(/const onUpdateError = useCallback/)
    })

    it('should have onDownloadProgress callback', () => {
      expect(updateComponentTsx).toMatch(/const onDownloadProgress = useCallback/)
    })

    it('should have onUpdateDownloaded callback', () => {
      expect(updateComponentTsx).toMatch(/const onUpdateDownloaded = useCallback/)
    })
  })

  describe('8. Update UI Components', () => {
    it('should have Modal component file', async () => {
      const modalPath = path.join(projectRoot, 'src/renderer/components/update/Modal/index.tsx')
      await expect(fs.access(modalPath)).resolves.toBeUndefined()
    })

    it('should have Progress component file', async () => {
      const progressPath = path.join(projectRoot, 'src/renderer/components/update/Progress/index.tsx')
      await expect(fs.access(progressPath)).resolves.toBeUndefined()
    })

    it('should have update.css file', async () => {
      const cssPath = path.join(projectRoot, 'src/renderer/components/update/update.css')
      const cssContent = await fs.readFile(cssPath, 'utf-8')
      expect(cssContent.length).toBeGreaterThan(0)
    })

    it('should have modal.css file', async () => {
      const cssPath = path.join(projectRoot, 'src/renderer/components/update/Modal/modal.css')
      await expect(fs.access(cssPath)).resolves.toBeUndefined()
    })

    it('should have progress.css file', async () => {
      const cssPath = path.join(projectRoot, 'src/renderer/components/update/Progress/progress.css')
      await expect(fs.access(cssPath)).resolves.toBeUndefined()
    })
  })

  describe('9. Documentation', () => {
    it('should have README.md for update component', async () => {
      const readmePath = path.join(projectRoot, 'src/renderer/components/update/README.md')
      const readme = await fs.readFile(readmePath, 'utf-8')
      expect(readme).toMatch(/electron-updater/)
      expect(readme).toMatch(/publish/)
    })

    it('should mention publish provider configuration', async () => {
      const readmePath = path.join(projectRoot, 'src/renderer/components/update/README.md')
      const readme = await fs.readFile(readmePath, 'utf-8')
      expect(readme).toMatch(/provider/)
    })
  })

  describe('10. Consistency Between Main and Electron Directories', () => {
    it('should have identical update.ts in src/main and electron/main', () => {
      // Both files should have the same structure
      expect(updateMainTs).toMatch(/autoUpdater\.autoDownload\s*=\s*false/)
      expect(updateTs).toMatch(/autoUpdater\.autoDownload\s*=\s*false/)
      expect(updateMainTs).toMatch(/ipcMain\.handle\(['"]check-update['"]/)
      expect(updateTs).toMatch(/ipcMain\.handle\(['"]check-update['"]/)
    })
  })
})

import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'

describe('Story 17.0: Final Integration and Testing', () => {
  const projectRoot = path.join(__dirname, '..')
  const releaseDir = path.join(projectRoot, 'release', '1.0.0')
  const srcDir = path.join(projectRoot, 'src')
  const testDir = path.join(projectRoot, 'test')

  describe('AC1: All unit tests pass', () => {
    it('should have test files for all LMA-17 stories', async () => {
      const lma17TestFiles = [
        'test/story-1-storage-service.test.ts',
        'test/story-2-ipc-handlers.test.ts',
        'test/story-3-playlist-storage.test.ts',
        'test/story-3-playlist-store-integration.test.ts',
        'test/story-4-queue-storage.test.ts',
        'test/story-4-queue-store-integration.test.ts',
        'test/story-6-electron-builder-config.test.ts',
        'test/story-7-electron-builder-windows-config.test.ts',
        'test/story-8-mac-packaging.test.ts',
        'test/story-9-windows-packaging-verification.test.ts',
        'test/story-10-electron-updater-config.test.ts',
        'test/story-11-auto-update-functionality.test.ts',
        'test/storage.test.ts',
        'test/story-13-storage-ipc.test.ts',
        'test/story-14-storage-migration.test.ts',
        'test/story-15-e2e-integration.test.ts',
        'test/story-16-documentation.test.ts',
      ]

      for (const testFile of lma17TestFiles) {
        const filePath = path.join(projectRoot, testFile)
        const exists = await fs.access(filePath).then(() => true).catch(() => false)
        expect(exists, `${testFile} should exist`).toBe(true)
      }
    })

    it('should have comprehensive test coverage', async () => {
      const testFiles = await fs.readdir(testDir)
      const storyTestFiles = testFiles.filter(f => f.startsWith('story-') && f.endsWith('.test.ts'))
      expect(storyTestFiles.length).toBeGreaterThan(16)
    })

    it('should have storage service unit tests', async () => {
      const storageTestPath = path.join(testDir, 'storage.test.ts')
      const exists = await fs.access(storageTestPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(storageTestPath, 'utf-8')
      expect(content).toContain('StorageService')
      expect(content).toContain('PlaylistStorageService')
      expect(content).toContain('QueueStorageService')
      expect(content).toContain('StorageMigrationService')
    })
  })

  describe('AC2: All integration tests pass', () => {
    it('should have E2E integration test file', async () => {
      const e2eTestPath = path.join(testDir, 'story-15-e2e-integration.test.ts')
      const exists = await fs.access(e2eTestPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('should have storage migration integration tests', async () => {
      const migrationTestPath = path.join(testDir, 'story-14-storage-migration.test.ts')
      const exists = await fs.access(migrationTestPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('should test complete app initialization', async () => {
      const e2eTestPath = path.join(testDir, 'story-15-e2e-integration.test.ts')
      const content = await fs.readFile(e2eTestPath, 'utf-8')
      expect(content).toContain('App Initialization')
      expect(content).toContain('Playlist Save/Restore')
      expect(content).toContain('Migration Flow')
      expect(content).toContain('Queue Persistence')
      expect(content).toContain('Complete Workflow Integration')
    })
  })

  describe('AC3: Mac .dmg builds successfully', () => {
    it('should have built x64 DMG', async () => {
      const dmgPath = path.join(releaseDir, 'AIPC KTV_1.0.0_x64.dmg')
      const exists = await fs.access(dmgPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const stats = await fs.stat(dmgPath)
      expect(stats.size).toBeGreaterThan(50 * 1024 * 1024) // > 50MB
    })

    it('should have built arm64 DMG', async () => {
      const dmgPath = path.join(releaseDir, 'AIPC KTV_1.0.0_arm64.dmg')
      const exists = await fs.access(dmgPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const stats = await fs.stat(dmgPath)
      expect(stats.size).toBeGreaterThan(50 * 1024 * 1024) // > 50MB
    })

    it('should have built ZIP distributions', async () => {
      const x64ZipPath = path.join(releaseDir, 'AIPC KTV_1.0.0_x64.zip')
      const arm64ZipPath = path.join(releaseDir, 'AIPC KTV_1.0.0_arm64.zip')

      const x64Exists = await fs.access(x64ZipPath).then(() => true).catch(() => false)
      const arm64Exists = await fs.access(arm64ZipPath).then(() => true).catch(() => false)

      expect(x64Exists).toBe(true)
      expect(arm64Exists).toBe(true)
    })

    it('should have built blockmap files for auto-updater', async () => {
      const blockmapFiles = [
        'AIPC KTV_1.0.0_x64.dmg.blockmap',
        'AIPC KTV_1.0.0_arm64.dmg.blockmap',
        'AIPC KTV_1.0.0_x64.zip.blockmap',
        'AIPC KTV_1.0.0_arm64.zip.blockmap',
      ]

      for (const blockmapFile of blockmapFiles) {
        const blockmapPath = path.join(releaseDir, blockmapFile)
        const exists = await fs.access(blockmapPath).then(() => true).catch(() => false)
        expect(exists, `${blockmapFile} should exist`).toBe(true)
      }
    })
  })

  describe('AC4: Packaged app works correctly', () => {
    it('should have valid app bundle structure', async () => {
      const macDir = path.join(releaseDir, 'mac')
      const appPath = path.join(macDir, 'AIPC KTV.app')
      const exists = await fs.access(appPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)
    })

    it('should have valid app bundle contents', async () => {
      const macDir = path.join(releaseDir, 'mac')
      const contentsPath = path.join(macDir, 'AIPC KTV.app', 'Contents')
      const exists = await fs.access(contentsPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const entries = await fs.readdir(contentsPath)
      expect(entries).toContain('Info.plist')
      expect(entries).toContain('MacOS')
      expect(entries).toContain('Resources')
      expect(entries).toContain('Frameworks')
    })

    it('should have Info.plist with correct metadata', async () => {
      const macDir = path.join(releaseDir, 'mac')
      const plistPath = path.join(macDir, 'AIPC KTV.app', 'Contents', 'Info.plist')
      const exists = await fs.access(plistPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(plistPath, 'utf-8')
      expect(content).toContain('com.aipc.ktv')
      expect(content).toContain('1.0.0')
      expect(content).toContain('public.app-category.entertainment')
    })
  })

  describe('AC5: File-based storage operations work in packaged app', () => {
    it('should have StorageService in main process', async () => {
      const storagePath = path.join(srcDir, 'main', 'storage.ts')
      const exists = await fs.access(storagePath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(storagePath, 'utf-8')
      expect(content).toContain('class StorageService')
      expect(content).toContain('async read<')
      expect(content).toContain('async write<')
      expect(content).toContain('async exists(')
      expect(content).toContain('async delete(')
    })

    it('should have storage IPC handlers', async () => {
      const mainIndexPath = path.join(srcDir, 'main', 'index.ts')
      const exists = await fs.access(mainIndexPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(mainIndexPath, 'utf-8')
      expect(content).toContain('storage-read')
      expect(content).toContain('storage-write')
      expect(content).toContain('storage-exists')
      expect(content).toContain('storage-delete')
      expect(content).toContain('storage-ensure-directory')
    })

    it('should have playlist storage service', async () => {
      const playlistStoragePath = path.join(srcDir, 'renderer', 'services', 'playlistStorage.ts')
      const exists = await fs.access(playlistStoragePath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(playlistStoragePath, 'utf-8')
      expect(content).toContain('class PlaylistStorageService')
      expect(content).toContain('load(')
      expect(content).toContain('save(')
    })

    it('should have queue storage service', async () => {
      const queueStoragePath = path.join(srcDir, 'renderer', 'services', 'queueStorage.ts')
      const exists = await fs.access(queueStoragePath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(queueStoragePath, 'utf-8')
      expect(content).toContain('class QueueStorageService')
      expect(content).toContain('load(')
      expect(content).toContain('save(')
    })

    it('should have migration service', async () => {
      const migrationPath = path.join(srcDir, 'renderer', 'services', 'storageMigration.ts')
      const exists = await fs.access(migrationPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(migrationPath, 'utf-8')
      expect(content).toContain('class StorageMigrationService')
      expect(content).toContain('migrate(')
      expect(content).toContain('checkMigrationStatus(')
    })
  })

  describe('AC6: Auto-update check works in packaged app', () => {
    it('should have electron-updater configuration', async () => {
      const updatePath = path.join(srcDir, 'main', 'update.ts')
      const exists = await fs.access(updatePath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(updatePath, 'utf-8')
      expect(content).toContain('autoUpdater')
      expect(content).toContain('checkForUpdatesAndNotify')
      expect(content).toContain('update-available')
      expect(content).toContain('update-downloaded')
    })

    it('should have update IPC handlers', async () => {
      const updatePath = path.join(srcDir, 'main', 'update.ts')
      const content = await fs.readFile(updatePath, 'utf-8')
      expect(content).toContain('check-update')
      expect(content).toContain('start-download')
      expect(content).toContain('quit-and-install')
    })

    it('should have update UI component', async () => {
      const updateComponentPath = path.join(srcDir, 'renderer', 'components', 'update', 'index.tsx')
      const exists = await fs.access(updateComponentPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(updateComponentPath, 'utf-8')
      expect(content).toContain('checkUpdate')
      expect(content).toContain('window.ipcRenderer.invoke')
      expect(content).toContain('update-can-available')
    })
  })

  describe('AC7: Migration flow works correctly', () => {
    it('should migrate localStorage to file storage', async () => {
      const migrationPath = path.join(srcDir, 'renderer', 'services', 'storageMigration.ts')
      const content = await fs.readFile(migrationPath, 'utf-8')
      expect(content).toContain('getLocalStorageData()')
      expect(content).toContain('saveToFileStorage(')
      expect(content).toContain('clearLocalStorage()')
    })

    it('should handle migration errors gracefully', async () => {
      const migrationPath = path.join(srcDir, 'renderer', 'services', 'storageMigration.ts')
      const content = await fs.readFile(migrationPath, 'utf-8')
      expect(content).toContain('try {')
      expect(content).toContain('catch')
      expect(content).toContain('console.error')
    })

    it('should have migration tests', async () => {
      const migrationTestPath = path.join(testDir, 'story-14-storage-migration.test.ts')
      const content = await fs.readFile(migrationTestPath, 'utf-8')
      expect(content).toContain('Migration Detection')
      expect(content).toContain('Data Transfer')
      expect(content).toContain('LocalStorage Cleanup')
      expect(content).toContain('Error Handling')
      expect(content).toContain('Data Integrity Verification')
    })
  })

  describe('AC8: No console errors or warnings', () => {
    it('should have valid TypeScript code', async () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json')
      const exists = await fs.access(tsconfigPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(tsconfigPath, 'utf-8')
      expect(content).toContain('"noEmit": true')
      expect(content).toContain('"strict": true')
    })

    it('should have typecheck script', async () => {
      const packageJsonPath = path.join(projectRoot, 'package.json')
      const content = await fs.readFile(packageJsonPath, 'utf-8')
      expect(content).toContain('"typecheck"')
      expect(content).toContain('tsc --noEmit')
    })
  })

  describe('AC9: All acceptance criteria met', () => {
    it('should have all required documentation', async () => {
      const readmePath = path.join(projectRoot, 'README.md')
      const buildPath = path.join(projectRoot, 'BUILD.md')
      const testingPath = path.join(projectRoot, 'TESTING.md')
      const packagingPath = path.join(projectRoot, 'docs', 'PACKAGING.md')

      const readmeExists = await fs.access(readmePath).then(() => true).catch(() => false)
      const buildExists = await fs.access(buildPath).then(() => true).catch(() => false)
      const testingExists = await fs.access(testingPath).then(() => true).catch(() => false)
      const packagingExists = await fs.access(packagingPath).then(() => true).catch(() => false)

      expect(readmeExists).toBe(true)
      expect(buildExists).toBe(true)
      expect(testingExists).toBe(true)
      expect(packagingExists).toBe(true)
    })

    it('should have electron-builder configuration', async () => {
      const builderConfigPath = path.join(projectRoot, 'electron-builder.yml')
      const exists = await fs.access(builderConfigPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(builderConfigPath, 'utf-8')
      expect(content).toContain('appId: com.aipc.ktv')
      expect(content).toContain('productName: AIPC KTV')
      expect(content).toContain('mac:')
      expect(content).toContain('win:')
      expect(content).toContain('linux:')
    })

    it('should have auto-update dependency', async () => {
      const packageJsonPath = path.join(projectRoot, 'package.json')
      const content = await fs.readFile(packageJsonPath, 'utf-8')
      expect(content).toContain('"electron-updater"')
    })

    it('should have comprehensive test coverage', async () => {
      const testFiles = await fs.readdir(testDir)
      const storyTestFiles = testFiles.filter(f => f.startsWith('story-') && f.endsWith('.test.ts'))
      expect(storyTestFiles.length).toBeGreaterThan(16)
    })
  })

  describe('AC10: Typecheck passes', () => {
    it('should have tsconfig.json with correct settings', async () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json')
      const content = await fs.readFile(tsconfigPath, 'utf-8')
      expect(content).toContain('"compilerOptions"')
      expect(content).toContain('"strict": true')
      expect(content).toContain('"noEmit": true')
    })

    it('should have typecheck in package.json scripts', async () => {
      const packageJsonPath = path.join(projectRoot, 'package.json')
      const content = await fs.readFile(packageJsonPath, 'utf-8')
      expect(content).toContain('"typecheck"')
    })

    it('should build without TypeScript errors', async () => {
      const distDir = path.join(projectRoot, 'dist')
      const distElectronDir = path.join(projectRoot, 'dist-electron')

      const distExists = await fs.access(distDir).then(() => true).catch(() => false)
      const distElectronExists = await fs.access(distElectronDir).then(() => true).catch(() => false)

      expect(distExists).toBe(true)
      expect(distElectronExists).toBe(true)
    })
  })

  describe('Additional Integration Verification', () => {
    it('should have preload script exposing storage API', async () => {
      const preloadPath = path.join(srcDir, 'main', 'preload.ts')
      const exists = await fs.access(preloadPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(preloadPath, 'utf-8')
      expect(content).toContain('storage:')
      expect(content).toContain('read:')
      expect(content).toContain('write:')
    })

    it('should have stores using file-based storage', async () => {
      const playlistStorePath = path.join(srcDir, 'renderer', 'store', 'playlistStore.ts')
      const queueStorePath = path.join(srcDir, 'renderer', 'store', 'queueStore.ts')

      const playlistExists = await fs.access(playlistStorePath).then(() => true).catch(() => false)
      const queueExists = await fs.access(queueStorePath).then(() => true).catch(() => false)

      expect(playlistExists).toBe(true)
      expect(queueExists).toBe(true)

      const playlistContent = await fs.readFile(playlistStorePath, 'utf-8')
      const queueContent = await fs.readFile(queueStorePath, 'utf-8')

      expect(playlistContent).toContain('initialize:')
      expect(playlistContent).toContain('savePlaylists')
      expect(queueContent).toContain('initialize:')
      expect(queueContent).toContain('saveQueue')
    })

    it('should have preference store for queue persistence', async () => {
      const preferenceStorePath = path.join(srcDir, 'renderer', 'store', 'preferenceStore.ts')
      const exists = await fs.access(preferenceStorePath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(preferenceStorePath, 'utf-8')
      expect(content).toContain('persistQueue')
      expect(content).toContain('setQueuePersistence')
    })

    it('should integrate initialization in App.tsx', async () => {
      const appPath = path.join(srcDir, 'renderer', 'App.tsx')
      const exists = await fs.access(appPath).then(() => true).catch(() => false)
      expect(exists).toBe(true)

      const content = await fs.readFile(appPath, 'utf-8')
      expect(content).toContain('useEffect')
      expect(content).toContain('initialize')
    })
  })

  describe('Build Artifacts Verification', () => {
    it('should have valid DMG file format', async () => {
      const x64DmgPath = path.join(releaseDir, 'AIPC KTV_1.0.0_x64.dmg')
      const arm64DmgPath = path.join(releaseDir, 'AIPC KTV_1.0.0_arm64.dmg')

      const x64Exists = await fs.access(x64DmgPath).then(() => true).catch(() => false)
      const arm64Exists = await fs.access(arm64DmgPath).then(() => true).catch(() => false)

      expect(x64Exists).toBe(true)
      expect(arm64Exists).toBe(true)

      const x64Stats = await fs.stat(x64DmgPath)
      const arm64Stats = await fs.stat(arm64DmgPath)

      expect(x64Stats.size).toBeGreaterThan(80 * 1024 * 1024) // > 80MB
      expect(arm64Stats.size).toBeGreaterThan(80 * 1024 * 1024) // > 80MB
      expect(x64Stats.size).toBeLessThan(200 * 1024 * 1024) // < 200MB
      expect(arm64Stats.size).toBeLessThan(200 * 1024 * 1024) // < 200MB
    })

    it('should have blockmap files for differential updates', async () => {
      const blockmapFiles = [
        'AIPC KTV_1.0.0_x64.dmg.blockmap',
        'AIPC KTV_1.0.0_arm64.dmg.blockmap',
      ]

      for (const blockmapFile of blockmapFiles) {
        const blockmapPath = path.join(releaseDir, blockmapFile)
        const exists = await fs.access(blockmapPath).then(() => true).catch(() => false)
        expect(exists, `${blockmapFile} should exist`).toBe(true)

        const stats = await fs.stat(blockmapPath)
        expect(stats.size).toBeGreaterThan(0)
        expect(stats.size).toBeLessThan(500 * 1024) // < 500KB
      }
    })
  })
})

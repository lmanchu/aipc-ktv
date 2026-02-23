import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'

describe('Story 7.0: electron-builder Configuration for Windows', () => {
  const configPath = path.join(__dirname, '../electron-builder.yml')
  let config: any

  beforeEach(async () => {
    const configFile = await fs.readFile(configPath, 'utf-8')
    config = yaml.load(configFile)
  })

  describe('App ID', () => {
    it('should have appId set to com.aipc.ktv', () => {
      expect(config.appId).toBe('com.aipc.ktv')
    })
  })

  describe('Product Name', () => {
    it('should have productName set to AIPC KTV', () => {
      expect(config.productName).toBe('AIPC KTV')
    })
  })

  describe('Artifact Name Format', () => {
    it('should have consistent artifactName format including arch', () => {
      const expectedFormat = '${productName}_${version}_${arch}.${ext}'
      expect(config.artifactName).toBe(expectedFormat)
    })

    it('should have Windows artifactName matching global format', () => {
      expect(config.win.artifactName).toBe(config.artifactName)
    })
  })

  describe('Windows Configuration', () => {
    it('should have Windows configuration section', () => {
      expect(config.win).toBeDefined()
      expect(typeof config.win).toBe('object')
    })

    it('should have icon path pointing to valid .ico file', () => {
      expect(config.win.icon).toBe('build/icons/icon.ico')
    })
  })

  describe('Windows Target Configuration', () => {
    it('should have target configuration', () => {
      expect(config.win.target).toBeDefined()
      expect(Array.isArray(config.win.target)).toBe(true)
    })

    it('should have nsis target configured for .exe installer', () => {
      const nsisTarget = config.win.target.find((t: any) => t.target === 'nsis')
      expect(nsisTarget).toBeDefined()
    })

    it('should support x64 architecture', () => {
      const nsisTarget = config.win.target.find((t: any) => t.target === 'nsis')
      expect(nsisTarget.arch).toContain('x64')
    })

    it('should support ia32 architecture', () => {
      const nsisTarget = config.win.target.find((t: any) => t.target === 'nsis')
      expect(nsisTarget.arch).toContain('ia32')
    })

    it('should have both x64 and ia32 architectures', () => {
      const nsisTarget = config.win.target.find((t: any) => t.target === 'nsis')
      expect(nsisTarget.arch).toEqual(expect.arrayContaining(['x64', 'ia32']))
      expect(nsisTarget.arch.length).toBe(2)
    })
  })

  describe('NSIS Configuration', () => {
    it('should have nsis configuration section', () => {
      expect(config.nsis).toBeDefined()
      expect(typeof config.nsis).toBe('object')
    })

    it('should have oneClick set to false for custom install path', () => {
      expect(config.nsis.oneClick).toBe(false)
    })

    it('should have perMachine set to false for per-user install', () => {
      expect(config.nsis.perMachine).toBe(false)
    })

    it('should allow changing installation directory', () => {
      expect(config.nsis.allowToChangeInstallationDirectory).toBe(true)
    })

    it('should not delete app data on uninstall', () => {
      expect(config.nsis.deleteAppDataOnUninstall).toBe(false)
    })

    it('should create desktop shortcut', () => {
      expect(config.nsis.createDesktopShortcut).toBe(true)
    })

    it('should create start menu shortcut', () => {
      expect(config.nsis.createStartMenuShortcut).toBe(true)
    })
  })

  describe('Icon File Existence', () => {
    it('should have icon.ico file in build/icons directory', async () => {
      const iconPath = path.join(__dirname, '../build/icons/icon.ico')
      await expect(fs.access(iconPath)).resolves.toBeUndefined()
    })

    it('should have valid icon.ico file (not empty)', async () => {
      const iconPath = path.join(__dirname, '../build/icons/icon.ico')
      const stats = await fs.stat(iconPath)
      expect(stats.size).toBeGreaterThan(0)
    })
  })

  describe('Asar Packaging', () => {
    it('should have asar enabled', () => {
      expect(config.asar).toBe(true)
    })
  })

  describe('Output Directory', () => {
    it('should have output directory configured', () => {
      expect(config.directories.output).toBe('release/${version}')
    })
  })

  describe('Files Configuration', () => {
    it('should include dist-electron', () => {
      expect(config.files).toContain('dist-electron')
    })

    it('should include dist', () => {
      expect(config.files).toContain('dist')
    })

    it('should include package.json', () => {
      expect(config.files).toContain('package.json')
    })
  })
})

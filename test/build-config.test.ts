import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'

describe('Build Configuration', () => {
  describe('electron-builder.yml', () => {
    it('should exist and be valid YAML', () => {
      const configPath = join(process.cwd(), 'electron-builder.yml')
      expect(existsSync(configPath)).toBe(true)
      
      const configContent = readFileSync(configPath, 'utf8')
      expect(() => yaml.load(configContent)).not.toThrow()
    })

    it('should have proper app metadata', () => {
      const configPath = join(process.cwd(), 'electron-builder.yml')
      const configContent = readFileSync(configPath, 'utf8')
      const config = yaml.load(configContent) as any

      expect(config.appId).toBe('com.aipc.ktv')
      expect(config.productName).toBe('AIPC KTV')
      expect(config.artifactName).toBeDefined()
    })

    it('should configure Windows build', () => {
      const configPath = join(process.cwd(), 'electron-builder.yml')
      const configContent = readFileSync(configPath, 'utf8')
      const config = yaml.load(configContent) as any

      expect(config.win).toBeDefined()
      expect(config.win.icon).toBe('build/icons/icon.ico')
      expect(config.win.target).toBeDefined()
      expect(config.win.target[0].target).toBe('nsis')
      expect(config.win.target[0].arch).toContain('x64')
    })

    it('should configure macOS build', () => {
      const configPath = join(process.cwd(), 'electron-builder.yml')
      const configContent = readFileSync(configPath, 'utf8')
      const config = yaml.load(configContent) as any

      expect(config.mac).toBeDefined()
      expect(config.mac.icon).toBe('build/icons/icon.icns')
      expect(config.mac.category).toBe('public.app-category.entertainment')
      expect(config.mac.target).toBeDefined()
      expect(config.mac.target[0].target).toBe('dmg')
      expect(config.mac.target[1].target).toBe('zip')
    })

    it('should have proper NSIS configuration', () => {
      const configPath = join(process.cwd(), 'electron-builder.yml')
      const configContent = readFileSync(configPath, 'utf8')
      const config = yaml.load(configContent) as any

      expect(config.nsis).toBeDefined()
      expect(config.nsis.oneClick).toBe(false)
      expect(config.nsis.perMachine).toBe(false)
      expect(config.nsis.allowToChangeInstallationDirectory).toBe(true)
      expect(config.nsis.createDesktopShortcut).toBe(true)
      expect(config.nsis.createStartMenuShortcut).toBe(true)
    })
  })

  describe('package.json build scripts', () => {
    it('should have all required build scripts', () => {
      const packagePath = join(process.cwd(), 'package.json')
      const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'))

      expect(packageContent.scripts.build).toBeDefined()
      expect(packageContent.scripts.dist).toBeDefined()
      expect(packageContent.scripts['dist:win']).toBeDefined()
      expect(packageContent.scripts['dist:mac']).toBeDefined()
    })

    it('should have proper app metadata in package.json', () => {
      const packagePath = join(process.cwd(), 'package.json')
      const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'))

      expect(packageContent.name).toBe('aipc-ktv')
      expect(packageContent.version).toBeDefined()
      expect(packageContent.description).toBeDefined()
      expect(packageContent.author).toBeDefined()
      expect(packageContent.license).toBe('MIT')
    })

    it('should have electron-builder as dev dependency', () => {
      const packagePath = join(process.cwd(), 'package.json')
      const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'))

      expect(packageContent.devDependencies['electron-builder']).toBeDefined()
    })
  })

  describe('Icon assets', () => {
    it('should have all required icon files', () => {
      const iconPaths = [
        'build/icons/icon.ico',   // Windows
        'build/icons/icon.icns',  // macOS
        'build/icons/icon.png'    // Linux
      ]

      iconPaths.forEach(iconPath => {
        const fullPath = join(process.cwd(), iconPath)
        expect(existsSync(fullPath)).toBe(true)
      })
    })

    it('should have build/icons directory', () => {
      const iconsDir = join(process.cwd(), 'build', 'icons')
      expect(existsSync(iconsDir)).toBe(true)
    })
  })

  describe('Build output', () => {
    it('should have dist and dist-electron directories after build', () => {
      // These directories are created by the build process
      const distPath = join(process.cwd(), 'dist')
      const distElectronPath = join(process.cwd(), 'dist-electron')
      
      // Check if build output exists (may not exist in clean state)
      if (existsSync(distPath)) {
        expect(existsSync(join(distPath, 'index.html'))).toBe(true)
      }
      
      if (existsSync(distElectronPath)) {
        expect(existsSync(join(distElectronPath, 'main'))).toBe(true)
        expect(existsSync(join(distElectronPath, 'preload'))).toBe(true)
      }
    })
  })
})
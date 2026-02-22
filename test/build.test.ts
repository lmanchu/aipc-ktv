import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const projectRoot = join(__dirname, '..')

describe('Build Configuration', () => {
  let packageJson: any
  let electronBuilderConfig: any

  beforeAll(() => {
    // Load package.json
    const packageJsonPath = join(projectRoot, 'package.json')
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

    // Load electron-builder.yml
    const { load } = require('js-yaml')
    const electronBuilderPath = join(projectRoot, 'electron-builder.yml')
    electronBuilderConfig = load(readFileSync(electronBuilderPath, 'utf-8'))
  })

  describe('Package.json Configuration', () => {
    it('should have correct app metadata', () => {
      expect(packageJson.name).toBe('aipc-ktv')
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(packageJson.description).toBe('AIPC KTV - Open-source dual-screen karaoke application')
      expect(packageJson.author).toContain('lmanchu')
      expect(packageJson.license).toBe('MIT')
    })

    it('should have proper build scripts', () => {
      expect(packageJson.scripts).toHaveProperty('build')
      expect(packageJson.scripts).toHaveProperty('dist')
      expect(packageJson.scripts).toHaveProperty('dist:win')
      expect(packageJson.scripts).toHaveProperty('dist:mac')
      expect(packageJson.scripts).toHaveProperty('dist:linux')
    })

    it('should have electron-builder as dev dependency', () => {
      expect(packageJson.devDependencies).toHaveProperty('electron-builder')
    })
  })

  describe('Electron Builder Configuration', () => {
    it('should have correct app ID and product name', () => {
      expect(electronBuilderConfig.appId).toBe('com.aipc.ktv')
      expect(electronBuilderConfig.productName).toBe('AIPC KTV')
    })

    it('should have Windows configuration', () => {
      expect(electronBuilderConfig.win).toBeDefined()
      expect(electronBuilderConfig.win.icon).toBe('build/icons/icon.ico')
      expect(electronBuilderConfig.win.target).toBeDefined()
      expect(electronBuilderConfig.win.target[0].target).toBe('nsis')
    })

    it('should have macOS configuration', () => {
      expect(electronBuilderConfig.mac).toBeDefined()
      expect(electronBuilderConfig.mac.icon).toBe('build/icons/icon.icns')
      expect(electronBuilderConfig.mac.category).toBe('public.app-category.entertainment')
      expect(electronBuilderConfig.mac.target).toBeDefined()
    })

    it('should have Linux configuration', () => {
      expect(electronBuilderConfig.linux).toBeDefined()
      expect(electronBuilderConfig.linux.icon).toBe('build/icons/icon.png')
      expect(electronBuilderConfig.linux.category).toBe('AudioVideo')
    })
  })

  describe('Build Assets', () => {
    it('should have icon files in build/icons directory', () => {
      expect(existsSync(join(projectRoot, 'build/icons/icon.ico'))).toBe(true)
      expect(existsSync(join(projectRoot, 'build/icons/icon.icns'))).toBe(true)  
      expect(existsSync(join(projectRoot, 'build/icons/icon.png'))).toBe(true)
    })
  })

  describe('Build Output Structure', () => {
    it('should have proper directories configuration', () => {
      expect(electronBuilderConfig.directories).toBeDefined()
      expect(electronBuilderConfig.directories.output).toMatch(/release/)
    })

    it('should include required files in build', () => {
      expect(electronBuilderConfig.files).toContain('dist-electron')
      expect(electronBuilderConfig.files).toContain('dist')
      expect(electronBuilderConfig.files).toContain('package.json')
    })
  })
})
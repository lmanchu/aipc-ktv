import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'

describe('Story 6.0: electron-builder Configuration for Mac', () => {
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

    it('should have macOS artifactName matching global format', () => {
      expect(config.mac.artifactName).toBe(config.artifactName)
    })
  })

  describe('macOS Configuration', () => {
    it('should have macOS configuration section', () => {
      expect(config.mac).toBeDefined()
      expect(typeof config.mac).toBe('object')
    })

    it('should have macOS category set to public.app-category.entertainment', () => {
      expect(config.mac.category).toBe('public.app-category.entertainment')
    })

    it('should have icon path pointing to valid .icns file', () => {
      expect(config.mac.icon).toBe('build/icons/icon.icns')
    })

    it('should have identity set to null', () => {
      expect(config.mac.identity).toBe(null)
    })
  })

  describe('macOS Target Configuration', () => {
    it('should have target configuration', () => {
      expect(config.mac.target).toBeDefined()
      expect(Array.isArray(config.mac.target)).toBe(true)
    })

    it('should have dmg target configured', () => {
      const dmgTarget = config.mac.target.find((t: any) => t.target === 'dmg')
      expect(dmgTarget).toBeDefined()
    })

    it('should have zip target configured', () => {
      const zipTarget = config.mac.target.find((t: any) => t.target === 'zip')
      expect(zipTarget).toBeDefined()
    })

    it('should support x64 architecture', () => {
      const dmgTarget = config.mac.target.find((t: any) => t.target === 'dmg')
      expect(dmgTarget.arch).toContain('x64')
    })

    it('should support arm64 architecture', () => {
      const dmgTarget = config.mac.target.find((t: any) => t.target === 'dmg')
      expect(dmgTarget.arch).toContain('arm64')
    })

    it('should have both x64 and arm64 for dmg', () => {
      const dmgTarget = config.mac.target.find((t: any) => t.target === 'dmg')
      expect(dmgTarget.arch).toEqual(expect.arrayContaining(['x64', 'arm64']))
      expect(dmgTarget.arch.length).toBe(2)
    })

    it('should have both x64 and arm64 for zip', () => {
      const zipTarget = config.mac.target.find((t: any) => t.target === 'zip')
      expect(zipTarget.arch).toEqual(expect.arrayContaining(['x64', 'arm64']))
      expect(zipTarget.arch.length).toBe(2)
    })
  })

  describe('Icon File Existence', () => {
    it('should have icon.icns file in build/icons directory', async () => {
      const iconPath = path.join(__dirname, '../build/icons/icon.icns')
      await expect(fs.access(iconPath)).resolves.toBeUndefined()
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

import { describe, it, expect, beforeAll } from 'vitest'
import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

describe('Story 8.0: Test Mac Packaging (DMG Build)', () => {
  const releaseDir = join(process.cwd(), 'release', '1.0.0')
  
  beforeAll(() => {
    expect(existsSync(releaseDir)).toBe(true)
  })

  describe('AC1: npm run dist:mac completes successfully', () => {
    it('should have created release directory', () => {
      expect(existsSync(releaseDir)).toBe(true)
    })

    it('should have created DMG files', () => {
      const files = readdirSync(releaseDir)
      const dmgFiles = files.filter(f => f.endsWith('.dmg'))
      expect(dmgFiles.length).toBeGreaterThan(0)
      expect(dmgFiles.some(f => f.includes('x64'))).toBe(true)
      expect(dmgFiles.some(f => f.includes('arm64'))).toBe(true)
    })

    it('should have created ZIP files', () => {
      const files = readdirSync(releaseDir)
      const zipFiles = files.filter(f => f.endsWith('.zip'))
      expect(zipFiles.length).toBeGreaterThan(0)
      expect(zipFiles.some(f => f.includes('x64'))).toBe(true)
      expect(zipFiles.some(f => f.includes('arm64'))).toBe(true)
    })

    it('should have created blockmap files for auto-updater', () => {
      const files = readdirSync(releaseDir)
      const blockmapFiles = files.filter(f => f.endsWith('.blockmap'))
      expect(blockmapFiles.length).toBeGreaterThan(0)
      expect(blockmapFiles.some(f => f.includes('.dmg.blockmap'))).toBe(true)
    })
  })

  describe('AC2: .dmg file created in release directory', () => {
    it('should have x64 DMG file with correct name format', () => {
      const expectedName = 'AIPC KTV_1.0.0_x64.dmg'
      const filePath = join(releaseDir, expectedName)
      expect(existsSync(filePath)).toBe(true)
    })

    it('should have arm64 DMG file with correct name format', () => {
      const expectedName = 'AIPC KTV_1.0.0_arm64.dmg'
      const filePath = join(releaseDir, expectedName)
      expect(existsSync(filePath)).toBe(true)
    })

    it('should have DMG files with reasonable size', () => {
      const x64Dmg = join(releaseDir, 'AIPC KTV_1.0.0_x64.dmg')
      const arm64Dmg = join(releaseDir, 'AIPC KTV_1.0.0_arm64.dmg')
      
      const x64Stats = statSync(x64Dmg)
      const arm64Stats = statSync(arm64Dmg)
      
      expect(x64Stats.size).toBeGreaterThan(50 * 1024 * 1024) // > 50MB
      expect(x64Stats.size).toBeLessThan(200 * 1024 * 1024) // < 200MB
      expect(arm64Stats.size).toBeGreaterThan(50 * 1024 * 1024) // > 50MB
      expect(arm64Stats.size).toBeLessThan(200 * 1024 * 1024) // < 200MB
    })
  })

  describe('AC3-AC7: Package contents and structure', () => {
    it('should have unpacked app directories', () => {
      const files = readdirSync(releaseDir)
      expect(files).toContain('mac')
      expect(files).toContain('mac-arm64')
    })

    it('should have app bundles in unpacked directories', () => {
      const macDir = join(releaseDir, 'mac')
      const macArm64Dir = join(releaseDir, 'mac-arm64')
      
      expect(existsSync(macDir)).toBe(true)
      expect(existsSync(macArm64Dir)).toBe(true)
      
      const macContents = readdirSync(macDir)
      expect(macContents.length).toBeGreaterThan(0)
      
      const macArm64Contents = readdirSync(macArm64Dir)
      expect(macArm64Contents.length).toBeGreaterThan(0)
    })
  })

  describe('Additional build artifacts', () => {
    it('should have builder-debug.yml file', () => {
      const filePath = join(releaseDir, 'builder-debug.yml')
      expect(existsSync(filePath)).toBe(true)
    })

    it('should have ZIP files for redistribution', () => {
      const files = readdirSync(releaseDir)
      const zipFiles = files.filter(f => f.endsWith('.zip'))
      expect(zipFiles.length).toBeGreaterThan(0)
      
      const x64Zip = join(releaseDir, 'AIPC KTV_1.0.0_x64.zip')
      const arm64Zip = join(releaseDir, 'AIPC KTV_1.0.0_arm64.zip')
      
      expect(existsSync(x64Zip)).toBe(true)
      expect(existsSync(arm64Zip)).toBe(true)
    })
  })
})

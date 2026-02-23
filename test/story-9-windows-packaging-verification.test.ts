import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'

describe('Story 9.0: Verify Windows Packaging Configuration (EXE Build)', () => {
  const configPath = path.join(__dirname, '../electron-builder.yml')
  const buildDocPath = path.join(__dirname, '../BUILD.md')
  const testingDocPath = path.join(__dirname, '../TESTING.md')
  const iconPath = path.join(__dirname, '../build/icons/icon.ico')
  let config: any

  beforeEach(async () => {
    const configFile = await fs.readFile(configPath, 'utf-8')
    config = yaml.load(configFile)
  })

  describe('Windows Configuration Completeness', () => {
    it('should have complete Windows configuration', () => {
      expect(config.win).toBeDefined()
      expect(typeof config.win).toBe('object')
      expect(Object.keys(config.win).length).toBeGreaterThan(0)
    })

    it('should have appId configured', () => {
      expect(config.appId).toBe('com.aipc.ktv')
      expect(config.appId).toMatch(/^com\.[a-z0-9-]+\.[a-z0-9-]+$/)
    })

    it('should have productName configured', () => {
      expect(config.productName).toBe('AIPC KTV')
      expect(config.productName.length).toBeGreaterThan(0)
    })

    it('should have artifactName with version and arch', () => {
      expect(config.artifactName).toBe('${productName}_${version}_${arch}.${ext}')
      expect(config.artifactName).toContain('${productName}')
      expect(config.artifactName).toContain('${version}')
      expect(config.artifactName).toContain('${arch}')
      expect(config.artifactName).toContain('${ext}')
    })
  })

  describe('Icon.ico File Validation', () => {
    it('should have icon.ico file in build/icons directory', async () => {
      await expect(fs.access(iconPath)).resolves.toBeUndefined()
    })

    it('should have valid icon.ico file size', async () => {
      const stats = await fs.stat(iconPath)
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.size).toBeGreaterThan(10000) // At least 10KB
      expect(stats.size).toBeLessThan(1000000) // Less than 1MB
    })

    it('should have valid icon.ico file content', async () => {
      const buffer = await fs.readFile(iconPath)
      expect(buffer.length).toBeGreaterThan(0)
      // ICO files start with magic number 0x00 0x00 0x01 0x00
      expect(buffer[0]).toBe(0x00)
      expect(buffer[1]).toBe(0x00)
      expect(buffer[2]).toBe(0x01)
      expect(buffer[3]).toBe(0x00)
    })

    it('should have icon path configured in Windows settings', () => {
      expect(config.win.icon).toBe('build/icons/icon.ico')
    })
  })

  describe('NSIS Settings Configuration', () => {
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

    it('should have NSIS target configured for Windows', () => {
      expect(config.win.target).toBeDefined()
      expect(Array.isArray(config.win.target)).toBe(true)
      const nsisTarget = config.win.target.find((t: any) => t.target === 'nsis')
      expect(nsisTarget).toBeDefined()
    })

    it('should have x64 architecture support in NSIS target', () => {
      const nsisTarget = config.win.target.find((t: any) => t.target === 'nsis')
      expect(nsisTarget.arch).toContain('x64')
    })

    it('should have ia32 architecture support in NSIS target', () => {
      const nsisTarget = config.win.target.find((t: any) => t.target === 'nsis')
      expect(nsisTarget.arch).toContain('ia32')
    })

    it('should have both x64 and ia32 architectures', () => {
      const nsisTarget = config.win.target.find((t: any) => t.target === 'nsis')
      expect(nsisTarget.arch).toEqual(expect.arrayContaining(['x64', 'ia32']))
      expect(nsisTarget.arch.length).toBe(2)
    })
  })

  describe('Build Requirements Documentation', () => {
    it('should have BUILD.md documentation file', async () => {
      await expect(fs.access(buildDocPath)).resolves.toBeUndefined()
    })

    it('should have non-empty BUILD.md content', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content.length).toBeGreaterThan(0)
      expect(content.trim()).not.toBe('')
    })

    it('should contain Windows build section in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/Windows/i)
      expect(content).toMatch(/building/i)
    })

    it('should contain build prerequisites in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/prerequisites/i)
      expect(content).toMatch(/Node\.js/i)
    })

    it('should contain build script commands in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/npm run dist:win/i)
      expect(content).toMatch(/npm run build/i)
    })

    it('should contain platform-specific requirements in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/platform-specific/i)
      expect(content).toMatch(/System Requirements/i)
    })

    it('should contain installation instructions in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/installation/i)
      expect(content).toMatch(/npm install/i)
    })

    it('should contain NSIS configuration details in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/NSIS/i)
      expect(content).toMatch(/installer/i)
    })

    it('should contain build artifacts information in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/artifacts/i)
      expect(content).toMatch(/release/i)
      expect(content).toMatch(/\.exe/i)
    })

    it('should contain troubleshooting section in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/troubleshooting/i)
    })
  })

  describe('Manual Testing Steps Documentation', () => {
    it('should have TESTING.md documentation file', async () => {
      await expect(fs.access(testingDocPath)).resolves.toBeUndefined()
    })

    it('should have non-empty TESTING.md content', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content.length).toBeGreaterThan(0)
      expect(content.trim()).not.toBe('')
    })

    it('should contain Windows testing section in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/Windows Testing/i)
    })

    it('should contain installation testing steps in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/installation testing/i)
      expect(content).toMatch(/\.exe/i)
    })

    it('should contain launch testing steps in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/launch testing/i)
      expect(content).toMatch(/launch/i)
    })

    it('should contain functionality testing steps in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/functionality testing/i)
      expect(content).toMatch(/queue/i)
      expect(content).toMatch(/playlist/i)
    })

    it('should contain dual-screen testing in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/dual-screen/i)
      expect(content).toMatch(/display window/i)
    })

    it('should contain file-based storage testing in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/file-based storage/i)
      expect(content).toMatch(/persist/i)
    })

    it('should contain performance testing in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/performance testing/i)
      expect(content).toMatch(/memory/i)
      expect(content).toMatch(/CPU/i)
    })

    it('should contain testing checklist in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/checklist/i)
      expect(content).toMatch(/\[ \]/i) // Checkbox format
    })

    it('should contain bug reporting section in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/reporting bugs/i)
      expect(content).toMatch(/steps to reproduce/i)
    })
  })

  describe('Build Configuration Validation', () => {
    it('should have asar packaging enabled', () => {
      expect(config.asar).toBe(true)
    })

    it('should have output directory configured', () => {
      expect(config.directories.output).toBe('release/${version}')
    })

    it('should include dist-electron in files', () => {
      expect(config.files).toContain('dist-electron')
    })

    it('should include dist in files', () => {
      expect(config.files).toContain('dist')
    })

    it('should include package.json in files', () => {
      expect(config.files).toContain('package.json')
    })

    it('should have correct file configuration', () => {
      expect(config.files).toEqual(expect.arrayContaining([
        'dist-electron',
        'dist',
        'package.json'
      ]))
      expect(config.files.length).toBeGreaterThanOrEqual(3)
    })

    it('should have correct version in package.json', async () => {
      const packagePath = path.join(__dirname, '../package.json')
      const packageContent = await fs.readFile(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)
      expect(packageJson.version).toBe('1.0.0')
    })

    it('should have build scripts in package.json', async () => {
      const packagePath = path.join(__dirname, '../package.json')
      const packageContent = await fs.readFile(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)
      expect(packageJson.scripts.build).toBeDefined()
      expect(packageJson.scripts['dist:win']).toBeDefined()
    })

    it('should have electron-builder as devDependency', async () => {
      const packagePath = path.join(__dirname, '../package.json')
      const packageContent = await fs.readFile(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)
      expect(packageJson.devDependencies['electron-builder']).toBeDefined()
    })
  })

  describe('Documentation Quality', () => {
    it('should have BUILD.md with markdown formatting', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/^#+\s/) // Markdown headers
      expect(content).toMatch(/```/) // Code blocks
      expect(content).toMatch(/- /) // Lists
    })

    it('should have TESTING.md with markdown formatting', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/^#+\s/) // Markdown headers
      expect(content).toMatch(/```/) // Code blocks
      expect(content).toMatch(/- /) // Lists
    })

    it('should have comprehensive BUILD.md structure', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      // Check for key sections
      expect(content).toMatch(/Prerequisites/i)
      expect(content).toMatch(/Installation/i)
      expect(content).toMatch(/Building for Windows/i)
      expect(content).toMatch(/Troubleshooting/i)
    })

    it('should have comprehensive TESTING.md structure', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      // Check for key sections
      expect(content).toMatch(/Overview/i)
      expect(content).toMatch(/Windows Testing/i)
      expect(content).toMatch(/macOS Testing/i)
      expect(content).toMatch(/Linux Testing/i)
      expect(content).toMatch(/Testing Checklist/i)
    })

    it('should have clear instructions for Windows build', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/npm run dist:win/)
      expect(content).toMatch(/NSIS installer/i)
      expect(content).toMatch(/x64/)
      expect(content).toMatch(/ia32/)
    })

    it('should have clear installation steps for Windows', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/Download the installer/i)
      expect(content).toMatch(/Run the installer/i)
      expect(content).toMatch(/Verify installation/i)
    })
  })

  describe('Windows-Specific Requirements', () => {
    it('should document Windows version requirements in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/Windows 10/i)
    })

    it('should document Wine as alternative for cross-platform builds', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/Wine/i)
    })

    it('should document installer features in BUILD.md', async () => {
      const content = await fs.readFile(buildDocPath, 'utf-8')
      expect(content).toMatch(/custom installation path/i)
      expect(content).toMatch(/Desktop shortcut/i)
      expect(content).toMatch(/Start menu/i)
    })

    it('should document Windows-specific testing in TESTING.md', async () => {
      const content = await fs.readFile(testingDocPath, 'utf-8')
      expect(content).toMatch(/Task Manager/i)
      expect(content).toMatch(/Event Viewer/i)
      expect(content).toMatch(/Settings/i)
    })
  })

  describe('Integration with Typecheck', () => {
    it('should have package.json with typecheck script', async () => {
      const packagePath = path.join(__dirname, '../package.json')
      const packageContent = await fs.readFile(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)
      expect(packageJson.scripts.typecheck).toBe('tsc --noEmit')
    })

    it('should have build script that includes TypeScript compilation', async () => {
      const packagePath = path.join(__dirname, '../package.json')
      const packageContent = await fs.readFile(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)
      expect(packageJson.scripts.build).toMatch(/tsc/)
    })
  })
})

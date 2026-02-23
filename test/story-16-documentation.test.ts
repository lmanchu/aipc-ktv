import { describe, it, expect } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'

describe('Story 16.0 Documentation Verification', () => {
  const rootPath = path.join(__dirname, '..')
  const docsPath = path.join(rootPath, 'docs')

  describe('README.md', () => {
    const readmePath = path.join(rootPath, 'README.md')

    describe('README.md Existence', () => {
      it('should exist', async () => {
        await expect(fs.access(readmePath)).resolves.toBeUndefined()
      })

      it('should have non-empty content', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content.length).toBeGreaterThan(0)
        expect(content.trim()).not.toBe('')
      })
    })

    describe('README.md Content', () => {
      it('should contain project overview', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/AIPC KTV/i)
        expect(content).toMatch(/dual-screen/i)
        expect(content).toMatch(/karaoke/i)
      })

      it('should contain features section', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/## Features/i)
        expect(content).toMatch(/YouTube Integration/i)
        expect(content).toMatch(/Dual-Screen/i)
        expect(content).toMatch(/Queue Management/i)
        expect(content).toMatch(/Playlist System/i)
      })

      it('should contain file-based storage section', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/File-Based Storage/i)
        expect(content).toMatch(/Storage Architecture/i)
        expect(content).toMatch(/Storage Services/i)
        expect(content).toMatch(/playlistStorage/i)
        expect(content).toMatch(/queueStorage/i)
      })

      it('should contain packaging and auto-update section', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/Packaging/i)
        expect(content).toMatch(/Auto-Update/i)
        expect(content).toMatch(/electron-updater/i)
        expect(content).toMatch(/electron-builder/i)
      })

      it('should contain build scripts', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/npm run dist/i)
        expect(content).toMatch(/npm run dist:win/i)
        expect(content).toMatch(/npm run dist:mac/i)
        expect(content).toMatch(/npm run dist:linux/i)
      })

      it('should contain documentation links', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/BUILD\.md/i)
        expect(content).toMatch(/PACKAGING\.md/i)
        expect(content).toMatch(/TESTING\.md/i)
      })

      it('should mention platform-specific data locations', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/APPDATA.*aipc-ktv/)           // Windows
        expect(content).toMatch(/Library.*Application Support.*aipc-ktv/)  // macOS
        expect(content).toMatch(/\.config.*aipc-ktv/)           // Linux
      })
    })

    describe('README.md Structure', () => {
      it('should have proper markdown formatting', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/^#+\s/)  // Headers
        expect(content).toMatch(/```/)     // Code blocks
        expect(content).toMatch(/- /)      // Lists
      })

      it('should have quick start section', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/Quick Setup/i)
        expect(content).toMatch(/Prerequisites/i)
        expect(content).toMatch(/Installation/i)
      })

      it('should have directory structure section', async () => {
        const content = await fs.readFile(readmePath, 'utf-8')
        expect(content).toMatch(/Directory structure/i)
        expect(content).toMatch(/electron\//i)
        expect(content).toMatch(/src\//i)
        expect(content).toMatch(/docs\//i)
      })
    })
  })

  describe('docs/PACKAGING.md', () => {
    const packagingPath = path.join(docsPath, 'PACKAGING.md')

    describe('docs/PACKAGING.md Existence', () => {
      it('should exist', async () => {
        await expect(fs.access(packagingPath)).resolves.toBeUndefined()
      })

      it('should have non-empty content', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content.length).toBeGreaterThan(0)
        expect(content.trim()).not.toBe('')
      })
    })

    describe('docs/PACKAGING.md Content', () => {
      it('should contain packaging overview', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/Packaging Guide/i)
        expect(content).toMatch(/electron-builder/i)
        expect(content).toMatch(/Overview/i)
      })

      it('should contain build configuration section', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/Build Configuration/i)
        expect(content).toMatch(/electron-builder\.yml/i)
        expect(content).toMatch(/appId/i)
        expect(content).toMatch(/productName/i)
      })

      it('should contain Windows packaging section', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/Windows Packaging/i)
        expect(content).toMatch(/NSIS/i)
        expect(content).toMatch(/x64/i)
        expect(content).toMatch(/ia32/i)
        expect(content).toMatch(/\.exe/i)
      })

      it('should contain macOS packaging section', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/macOS Packaging/i)
        expect(content).toMatch(/DMG/i)
        expect(content).toMatch(/ZIP/i)
        expect(content).toMatch(/Intel/i)
        expect(content).toMatch(/Apple Silicon/i)
        expect(content).toMatch(/arm64/i)
      })

      it('should contain Linux packaging section', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/Linux Packaging/i)
        expect(content).toMatch(/AppImage/i)
        expect(content).toMatch(/DEB/i)
      })

      it('should contain auto-update section', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/Update Configuration/i)
        expect(content).toMatch(/electron-updater/i)
        expect(content).toMatch(/GitHub Releases/i)
      })

      it('should contain build scripts section', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/Build Scripts/i)
        expect(content).toMatch(/npm run dist/i)
      })

      it('should contain CI/CD integration', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/CI\/CD Integration/i)
        expect(content).toMatch(/GitHub Actions/i)
      })

      it('should contain troubleshooting section', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/Troubleshooting/i)
      })

      it('should mention file-based storage', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/File-Based Storage/i)
        expect(content).toMatch(/userData/i)
      })
    })

    describe('docs/PACKAGING.md Structure', () => {
      it('should have proper markdown formatting', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/^#+\s/)  // Headers
        expect(content).toMatch(/```/)     // Code blocks
        expect(content).toMatch(/- /)      // Lists
      })

      it('should have configuration examples', async () => {
        const content = await fs.readFile(packagingPath, 'utf-8')
        expect(content).toMatch(/```yaml/i)
        expect(content).toMatch(/appId: com\.aipc\.ktv/i)
      })
    })
  })

  describe('PATLABOR_SPEC.md', () => {
    const specPath = path.join(rootPath, 'PATLABOR_SPEC.md')

    describe('PATLABOR_SPEC.md Existence', () => {
      it('should exist', async () => {
        await expect(fs.access(specPath)).resolves.toBeUndefined()
      })

      it('should have non-empty content', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content.length).toBeGreaterThan(0)
        expect(content.trim()).not.toBe('')
      })
    })

    describe('PATLABOR_SPEC.md Content', () => {
      it('should contain file-based storage in tech stack', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/File-based/i)
        expect(content).toMatch(/JSON files via IPC/i)
        // Check that localStorage is not used as the primary storage method
        const localStorageAsPrimary = /Storage:.*localStorage/i
        expect(content).not.toMatch(localStorageAsPrimary)
      })

      it('should contain storage service details', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/StorageService/i)
        expect(content).toMatch(/storage\.ts/i)
      })

      it('should contain auto-update in tech stack', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/Auto-Update: electron-updater/i)
      })

      it('should contain packaging details in tech stack', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/Windows: NSIS installer/i)
        expect(content).toMatch(/macOS: DMG/i)
        expect(content).toMatch(/Linux: AppImage/i)
      })

      it('should have updated project structure', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/storage\.ts/i)
        expect(content).toMatch(/update\.ts/i)
        expect(content).toMatch(/playlistStorage\.ts/i)
        expect(content).toMatch(/queueStorage\.ts/i)
        expect(content).toMatch(/preferenceStore\.ts/i)
        expect(content).toMatch(/docs\//i)
      })

      it('should have updated Week 3 tasks', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/File-Based Storage/i)
        expect(content).toMatch(/Implement file-based storage service/i)
        expect(content).toMatch(/Implement IPC handlers for storage/i)
      })

      it('should have updated Week 4 tasks', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/Auto-Update Mechanism/i)
        expect(content).toMatch(/Configure electron-updater/i)
      })

      it('should have updated deliverables', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/PACKAGING\.md/i)
        expect(content).toMatch(/TESTING\.md/i)
        expect(content).toMatch(/File-based storage implementation/i)
        expect(content).toMatch(/Auto-update mechanism/i)
      })

      it('should have updated success criteria', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/File-based storage/i)
        expect(content).toMatch(/Auto-update mechanism/i)
        expect(content).toMatch(/Cross-platform.*Linux/)
      })

      it('should mention platform support', async () => {
        const content = await fs.readFile(specPath, 'utf-8')
        expect(content).toMatch(/Windows.*macOS.*Linux/)
      })
    })
  })

  describe('Documentation Consistency', () => {
    it('should have consistent platform names across docs', async () => {
      const [readme, packaging, spec] = await Promise.all([
        fs.readFile(path.join(rootPath, 'README.md'), 'utf-8'),
        fs.readFile(path.join(docsPath, 'PACKAGING.md'), 'utf-8'),
        fs.readFile(path.join(rootPath, 'PATLABOR_SPEC.md'), 'utf-8'),
      ])

      expect(readme).toMatch(/Windows/)
      expect(packaging).toMatch(/Windows/)
      expect(spec).toMatch(/Windows/)

      expect(readme).toMatch(/macOS/)
      expect(packaging).toMatch(/macOS/)
      expect(spec).toMatch(/macOS/)
    })

    it('should have consistent build commands across docs', async () => {
      const [readme, packaging] = await Promise.all([
        fs.readFile(path.join(rootPath, 'README.md'), 'utf-8'),
        fs.readFile(path.join(docsPath, 'PACKAGING.md'), 'utf-8'),
      ])

      expect(readme).toMatch(/npm run dist:win/)
      expect(packaging).toMatch(/npm run dist:win/)

      expect(readme).toMatch(/npm run dist:mac/)
      expect(packaging).toMatch(/npm run dist:mac/)
    })

    it('should have consistent file-based storage terminology', async () => {
      const [readme, packaging, spec] = await Promise.all([
        fs.readFile(path.join(rootPath, 'README.md'), 'utf-8'),
        fs.readFile(path.join(docsPath, 'PACKAGING.md'), 'utf-8'),
        fs.readFile(path.join(rootPath, 'PATLABOR_SPEC.md'), 'utf-8'),
      ])

      expect(readme).toMatch(/File-Based Storage/)
      expect(spec).toMatch(/File-based storage/)
    })
  })

  describe('Documentation Completeness', () => {
    it('README.md should cover all key topics', async () => {
      const content = await fs.readFile(path.join(rootPath, 'README.md'), 'utf-8')
      expect(content).toMatch(/Overview/i)
      expect(content).toMatch(/Features/i)
      expect(content).toMatch(/Quick Setup/i)
      expect(content).toMatch(/File-Based Storage/i)
      expect(content).toMatch(/Packaging/i)
      expect(content).toMatch(/Auto-Update/i)
    })

    it('docs/PACKAGING.md should cover all platforms', async () => {
      const content = await fs.readFile(path.join(docsPath, 'PACKAGING.md'), 'utf-8')
      expect(content).toMatch(/Windows Packaging/i)
      expect(content).toMatch(/macOS Packaging/i)
      expect(content).toMatch(/Linux Packaging/i)
    })

    it('PATLABOR_SPEC.md should have updated content', async () => {
      const content = await fs.readFile(path.join(rootPath, 'PATLABOR_SPEC.md'), 'utf-8')
      expect(content).toMatch(/File-based storage/i)
      expect(content).toMatch(/Auto-update/i)
      expect(content).toMatch(/Cross-platform packaging/i)
    })
  })
})

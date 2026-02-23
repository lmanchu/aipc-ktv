# AIPC KTV Build Guide

This guide covers how to build AIPC KTV for Windows, macOS, and Linux using electron-builder.

## Prerequisites

### System Requirements

- **Node.js**: >= 14.18.0 || >= 16.0.0
- **npm**: >= 7.0.0 (comes with Node.js)
- **Git**: >= 2.0.0
- **Disk Space**: ~500 MB for dependencies, ~200 MB for build artifacts

### Platform-Specific Requirements

#### Windows (for Windows builds)

- **OS**: Windows 10 or later
- **Optional**: NSIS (included with electron-builder)
- **Optional**: Wine (for building Windows on non-Windows platforms)

**Note**: While you can build Windows installers on macOS or Linux using Wine, we recommend building Windows executables on a Windows machine for best results.

#### macOS (for macOS builds)

- **OS**: macOS 10.15 (Catalina) or later
- **Xcode Command Line Tools**: Required for code signing (optional)
  ```bash
  xcode-select --install
  ```

**Optional**: Code signing certificate (for distribution outside App Store)
- Apple Developer account
- Distribution certificate from Apple Developer Portal

#### Linux (for Linux builds)

- **OS**: Any modern Linux distribution (Ubuntu 20.04+, Debian 10+, Fedora 33+, etc.)
- **Build tools**:
  - dpkg-deb (for .deb packages)
  - fakeroot (for .deb packages)
  - zsync (for delta updates)
  - rpmbuild (for .rpm packages, optional)

Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y fakeroot dpkg dpkg-dev zsync rpm
```

Fedora:
```bash
sudo dnf install -y dpkg dpkg-devel zsync rpm-build
```

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/aipc-ktv.git
   cd aipc-ktv
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables** (if needed):
   - Create a `.env` file in the root directory
   - Add any required API keys or configuration

## Build Scripts

The `package.json` includes the following build scripts:

- `npm run build` - Compile TypeScript and build frontend (no packaging)
- `npm run dist` - Build for current platform only
- `npm run dist:win` - Build Windows installers (x64 and ia32)
- `npm run dist:mac` - Build macOS installers (x64 and arm64)
- `npm run dist:linux` - Build Linux packages (x64)

## Building for Windows

### Method 1: Build on Windows (Recommended)

1. Ensure you're on a Windows machine with Node.js installed
2. Run:
   ```bash
   npm run dist:win
   ```

This will create:
- **NSIS installer**: `release/1.0.0/AIPC KTV_1.0.0_x64.exe` (64-bit)
- **NSIS installer**: `release/1.0.0/AIPC KTV_1.0.0_ia32.exe` (32-bit)

### Method 2: Build on macOS/Linux with Wine (Experimental)

1. Install Wine:
   - **macOS**: `brew install --cask wine-stable`
   - **Ubuntu/Debian**: `sudo apt-get install wine`

2. Run:
   ```bash
   npm run dist:win
   ```

**Note**: Wine builds may have limitations and are not recommended for production releases.

### Windows Build Details

- **Installer Type**: NSIS (Nullsoft Scriptable Install System)
- **Architectures**: x64 (64-bit), ia32 (32-bit)
- **Features**:
  - Custom installation path
  - Per-user installation (no admin rights required)
  - Desktop shortcut creation
  - Start menu shortcut creation
  - Preserves user data on uninstall

## Building for macOS

### Method 1: Build on macOS (Recommended)

1. Ensure you're on a Mac with macOS 10.15+ installed
2. Run:
   ```bash
   npm run dist:mac
   ```

This will create:
- **DMG installer**: `release/1.0.0/AIPC KTV_1.0.0_x64.dmg` (Intel)
- **DMG installer**: `release/1.0.0/AIPC KTV_1.0.0_arm64.dmg` (Apple Silicon)
- **ZIP archive**: `release/1.0.0/AIPC KTV_1.0.0_x64.zip` (Intel)
- **ZIP archive**: `release/1.0.0/AIPC KTV_1.0.0_arm64.zip` (Apple Silicon)

### macOS Build Details

- **Installer Type**: DMG (disk image) and ZIP
- **Architectures**: x64 (Intel), arm64 (Apple Silicon)
- **Features**:
  - App bundle format (.app)
  - Drag-and-drop installation
  - Category: public.app-category.entertainment
  - Optional code signing (not configured yet)

### Code Signing (Optional)

To sign your macOS app:

1. Get a code signing certificate from Apple Developer Portal
2. Add certificate identity to electron-builder.yml:
   ```yaml
   mac:
     identity: "Developer ID Application: Your Name (TEAM_ID)"
   ```

3. Build with signing:
   ```bash
   npm run dist:mac
   ```

## Building for Linux

1. Ensure you're on a Linux machine with build tools installed
2. Run:
   ```bash
   npm run dist:linux
   ```

This will create:
- **AppImage**: `release/1.0.0/AIPC KTV_1.0.0_x64.AppImage`
- **DEB package**: `release/1.0.0/aipc-ktv_1.0.0_amd64.deb`

### Linux Build Details

- **Installer Types**: AppImage, DEB
- **Architecture**: x64 (64-bit)
- **Category**: AudioVideo

## Build Artifacts

After building, you'll find the artifacts in the `release/` directory:

```
release/
└── 1.0.0/
    ├── AIPC KTV_1.0.0_x64.exe           # Windows installer
    ├── AIPC KTV_1.0.0_ia32.exe          # Windows installer (32-bit)
    ├── AIPC KTV_1.0.0_x64.dmg           # macOS installer (Intel)
    ├── AIPC KTV_1.0.0_arm64.dmg        # macOS installer (Apple Silicon)
    ├── AIPC KTV_1.0.0_x64.zip           # macOS archive (Intel)
    ├── AIPC KTV_1.0.0_arm64.zip        # macOS archive (Apple Silicon)
    ├── AIPC KTV_1.0.0_x64.AppImage      # Linux AppImage
    └── aipc-ktv_1.0.0_amd64.deb        # Linux DEB package
```

## Troubleshooting

### Build Fails with "ENOENT: no such file or directory"

- Ensure you're in the project root directory
- Run `npm install` to ensure dependencies are installed
- Check that `electron-builder.yml` exists in the root directory

### Windows Build Issues

- **Error**: "wine not found"
  - Install Wine: `brew install --cask wine-stable` (macOS) or `sudo apt-get install wine` (Linux)
  - Or build on a Windows machine (recommended)

- **Error**: "icon.ico not found"
  - Ensure `build/icons/icon.ico` exists in the project

### macOS Build Issues

- **Error**: "code signing failed"
  - This is optional for development
  - Set `identity: null` in electron-builder.yml to skip signing
  - Or configure a valid code signing certificate

- **Error**: "xcode-select not found"
  - Install Xcode Command Line Tools: `xcode-select --install`

### Linux Build Issues

- **Error**: "dpkg-deb not found"
  - Install build tools: `sudo apt-get install dpkg fakeroot`

- **Error**: "AppImage build failed"
  - Ensure AppImageTool is installed or electron-builder can download it
  - Check network connectivity for downloading dependencies

## Advanced Configuration

### electron-builder.yml

The build configuration is in `electron-builder.yml`. Key settings:

```yaml
appId: com.aipc.ktv
productName: AIPC KTV
artifactName: ${productName}_${version}_${arch}.${ext}
asar: true

directories:
  output: release/${version}

files:
  - dist-electron
  - dist
  - package.json

# Platform-specific settings
win:
  icon: build/icons/icon.ico
  target:
    - target: nsis
      arch:
        - x64
        - ia32

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

### Custom Icons

Replace icons in the `build/icons/` directory:
- **Windows**: `icon.ico` (55KB recommended)
- **macOS**: `icon.icns` (466KB recommended)
- **Linux**: `icon.png` (68KB recommended)

## CI/CD Integration

For automated builds, you can integrate with GitHub Actions, GitLab CI, or other CI/CD platforms.

Example GitHub Actions workflow:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run dist
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: release/*
```

## Support

For issues or questions:
- Check the [electron-builder documentation](https://www.electron.build/)
- Open an issue on GitHub

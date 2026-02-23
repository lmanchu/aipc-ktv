# AIPC KTV Packaging Guide

This guide provides detailed information about packaging AIPC KTV for distribution using electron-builder.

## Overview

AIPC KTV uses [electron-builder](https://www.electron.build/) for packaging the Electron application into installable distributions for Windows, macOS, and Linux.

### Packaging Goals

- **Cross-Platform Support**: Build for Windows, macOS, and Linux from a single codebase
- **Professional Installation**: Provide native installation experiences for each platform
- **Auto-Update Ready**: Include support for automatic updates using electron-updater
- **Small Footprint**: Optimize bundle size while maintaining functionality
- **Code Signing**: Support for code signing on Windows and macOS (optional)

## Build Configuration

The build configuration is stored in `electron-builder.yml` in the project root.

### Base Configuration

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

publish: null  # Set to update provider for production
```

### Key Configuration Options

- **appId**: Unique identifier for the application (com.aipc.ktv)
- **productName**: Human-readable application name (AIPC KTV)
- **artifactName**: Template for artifact filenames, includes productName, version, arch, and extension
- **asar**: Enables ASAR archiving to reduce bundle size and improve security
- **directories.output**: Where build artifacts are saved (release/${version})
- **files**: Files to include in the application bundle
- **publish**: Update provider configuration (null for development, configure for production)

## Windows Packaging

### Configuration

```yaml
win:
  icon: build/icons/icon.ico
  target:
    - target: nsis
      arch:
        - x64
        - ia32
  artifactName: ${productName}_${version}_${arch}.${ext}

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

### Installer Type: NSIS

**NSIS** (Nullsoft Scriptable Install System) provides a professional Windows installation experience.

#### NSIS Features

- **Custom Installation Path**: Users can choose where to install (`allowToChangeInstallationDirectory: true`)
- **Per-User Installation**: No admin rights required (`perMachine: false`)
- **Desktop Shortcut**: Creates a shortcut on the desktop (`createDesktopShortcut: true`)
- **Start Menu Shortcut**: Creates a shortcut in the Start menu (`createStartMenuShortcut: true`)
- **User Data Preservation**: Preserves user data on uninstall (`deleteAppDataOnUninstall: false`)

#### Architecture Support

- **x64**: 64-bit Windows installer
- **ia32**: 32-bit Windows installer

### Build Artifacts

Running `npm run dist:win` creates:

```
release/1.0.0/
├── AIPC KTV_1.0.0_x64.exe          # 64-bit installer (~80-100MB)
├── AIPC KTV_1.0.0_ia32.exe         # 32-bit installer (~80-100MB)
├── AIPC KTV_1.0.0_x64.exe.blockmap # Update manifest for x64
└── AIPC KTV_1.0.0_ia32.exe.blockmap # Update manifest for ia32
```

### Installation Location

Default: `C:\Users\<username>\AppData\Local\Programs\aipc-ktv\`

### User Data Location

Windows: `%APPDATA%\aipc-ktv\` (e.g., `C:\Users\<username>\AppData\Roaming\aipc-ktv\`)

Note: Electron's `app.getPath('userData')` returns the userData directory where file-based storage is located.

### Icon Requirements

- **File**: `build/icons/icon.ico`
- **Format**: Windows icon resource (ICO)
- **Sizes**: Multiple sizes recommended (16x16, 32x32, 48x48, 256x256)
- **File Size**: ~55KB

### Code Signing (Optional)

To sign Windows installers:

1. Obtain a code signing certificate from a Certificate Authority (e.g., DigiCert, Sectigo)
2. Configure electron-builder.yml:
   ```yaml
   win:
     certificateFile: path/to/certificate.pfx
     certificatePassword: your-password
   ```
3. Build with signing:
   ```bash
   npm run dist:win
   ```

### Troubleshooting Windows Builds

#### Issue: "wine not found" (building on macOS/Linux)

**Solution**: Install Wine
```bash
# macOS
brew install --cask wine-stable

# Linux
sudo apt-get install wine
```

**Note**: Building Windows installers on macOS/Linux with Wine is experimental. Building on Windows is recommended for production.

#### Issue: "icon.ico not found"

**Solution**: Ensure `build/icons/icon.ico` exists in the project.

#### Issue: NSIS installer fails

**Solution**: Check electron-builder logs for specific errors. Common issues:
- Missing icon file
- Invalid NSIS configuration
- Insufficient disk space

## macOS Packaging

### Configuration

```yaml
mac:
  category: public.app-category.entertainment
  icon: build/icons/icon.icns
  identity: null
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64
  artifactName: ${productName}_${version}_${arch}.${ext}
```

### Installer Types

- **DMG**: Disk image for drag-and-drop installation
- **ZIP**: Archive for redistribution

### Architecture Support

- **x64**: Intel Macs
- **arm64**: Apple Silicon Macs (M1, M2, M3)

### Build Artifacts

Running `npm run dist:mac` creates:

```
release/1.0.0/
├── AIPC KTV_1.0.0_x64.dmg           # Intel DMG (~95-100MB)
├── AIPC KTV_1.0.0_arm64.dmg        # Apple Silicon DMG (~90-95MB)
├── AIPC KTV_1.0.0_x64.zip           # Intel ZIP (~90-95MB)
├── AIPC KTV_1.0.0_arm64.zip        # Apple Silicon ZIP (~85-90MB)
├── AIPC KTV_1.0.0_x64.dmg.blockmap  # Update manifest for x64
└── AIPC KTV_1.0.0_arm64.dmg.blockmap # Update manifest for arm64
```

### Installation Location

`/Applications/` (drag-and-drop from DMG)

### User Data Location

macOS: `~/Library/Application Support/aipc-ktv/`

### App Bundle Structure

```
AIPC KTV.app/
└── Contents/
    ├── Info.plist           # App metadata
    ├── MacOS/
    │   └── aipc-ktv         # Executable
    ├── Resources/
    │   └── icon.icns        # App icon
    └── Frameworks/          # Electron frameworks
```

### Icon Requirements

- **File**: `build/icons/icon.icns`
- **Format**: macOS icon container (ICNS)
- **Sizes**: Multiple sizes recommended (16x16 to 1024x1024)
- **File Size**: ~466KB

### Code Signing (Optional)

To sign macOS apps:

1. Get a code signing certificate from Apple Developer Portal
2. Configure electron-builder.yml:
   ```yaml
   mac:
     identity: "Developer ID Application: Your Name (TEAM_ID)"
   ```
3. Build with signing:
   ```bash
   npm run dist:mac
   ```

### Notarization (Optional for Distribution)

To notarize macOS apps for distribution outside App Store:

1. Obtain Apple Developer account
2. Configure electron-builder.yml with notarization settings
3. Build and notarize:
   ```bash
   npm run dist:mac
   ```

### Troubleshooting macOS Builds

#### Issue: "code signing failed"

**Solution**: Set `identity: null` in electron-builder.yml to skip signing (for development).

#### Issue: "xcode-select not found"

**Solution**: Install Xcode Command Line Tools:
```bash
xcode-select --install
```

#### Issue: Gatekeeper blocks app launch

**Solution**: For unsigned apps, right-click the app and select "Open" to bypass Gatekeeper warning.

## Linux Packaging

### Configuration

```yaml
linux:
  icon: build/icons/icon.png
  category: AudioVideo
  target:
    - target: AppImage
      arch:
        - x64
    - target: deb
      arch:
        - x64
```

### Package Types

- **AppImage**: Universal Linux package format
- **DEB**: Debian/Ubuntu package

### Architecture Support

- **x64**: 64-bit Linux

### Build Artifacts

Running `npm run dist:linux` creates:

```
release/1.0.0/
├── AIPC KTV_1.0.0_x64.AppImage      # AppImage (~100-120MB)
├── aipc-ktv_1.0.0_amd64.deb         # DEB package (~90-100MB)
└── AIPC KTV_1.0.0_x64.AppImage.blockmap # Update manifest for x64
```

### Installation

#### AppImage

```bash
# Make executable
chmod +x "AIPC KTV_1.0.0_x64.AppImage"

# Run directly
./AIPC\ KTV_1.0.0_x64.AppImage

# Or integrate with system
./AIPC\ KTV_1.0.0_x64.AppImage --appimage-extract
sudo mv squashfs-root /opt/aipc-ktv
sudo ln -s /opt/aipc-ktv/AppRun /usr/local/bin/aipc-ktv
```

#### DEB Package

```bash
# Install
sudo dpkg -i aipc-ktv_1.0.0_amd64.deb

# If dependencies are missing
sudo apt-get install -f
```

### Installation Location

- **AppImage**: User's choice (typically in `/opt/aipc-ktv/`)
- **DEB**: `/usr/bin/` (binary), `/usr/share/` (resources)

### User Data Location

Linux: `~/.config/aipc-ktv/`

### Icon Requirements

- **File**: `build/icons/icon.png`
- **Format**: PNG image
- **Size**: 512x512 recommended
- **File Size**: ~68KB

### Troubleshooting Linux Builds

#### Issue: "dpkg-deb not found"

**Solution**: Install build tools:
```bash
sudo apt-get install -y fakeroot dpkg dpkg-dev zsync rpm
```

#### Issue: "AppImage build failed"

**Solution**: Ensure AppImageTool is available or electron-builder can download it. Check network connectivity.

## Update Configuration

AIPC KTV uses [electron-updater](https://www.electron.build/auto-update) for automatic updates.

### Update Provider Configuration

Configure the `publish` field in `electron-builder.yml`:

#### GitHub Releases (Recommended)

```yaml
publish:
  provider: github
  owner: your-username
  repo: aipc-ktv
```

#### Generic HTTP Server

```yaml
publish:
  provider: generic
  url: https://example.com/updates/
```

### Update Check Flow

1. App checks for updates on launch (and optionally on user request)
2. electron-updater fetches the latest version from the configured provider
3. If a newer version is available, user is notified
4. User can download and install the update
5. App restarts with the new version

### Update Artifacts

Blockmap files are generated for differential updates:
- `*.dmg.blockmap` (macOS)
- `*.exe.blockmap` (Windows)
- `*.AppImage.blockmap` (Linux)

These files contain checksums for differential updates, reducing download size.

## Build Scripts

The following scripts are defined in `package.json`:

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "dist": "npm run build && electron-builder",
    "dist:win": "npm run build && electron-builder --win",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:linux": "npm run build && electron-builder --linux"
  }
}
```

### Build Commands

- `npm run build`: Compile TypeScript and build frontend (no packaging)
- `npm run dist`: Build for current platform only
- `npm run dist:win`: Build Windows installers (x64 and ia32)
- `npm run dist:mac`: Build macOS installers (x64 and arm64)
- `npm run dist:linux`: Build Linux packages (x64)

## Build Optimization

### ASAR Archiving

ASAR (Atom Shell Archive) is enabled by default:
```yaml
asar: true
```

Benefits:
- Reduces bundle size
- Improves security (files are not directly accessible)
- Faster installation

### Excluding Files

To exclude files from the package, modify the `files` configuration:

```yaml
files:
  - dist-electron
  - dist
  - package.json
  - "!**/*.test.ts"       # Exclude test files
  - "!**/*.spec.ts"       # Exclude spec files
  - "!test/**"            # Exclude test directory
```

### Dependencies Management

- **Runtime dependencies**: Listed in `dependencies` in `package.json`
- **Development dependencies**: Listed in `devDependencies` in `package.json` (not included in package)

## CI/CD Integration

### GitHub Actions Example

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

### Environment Variables

Set environment variables for code signing:

```yaml
env:
  CSC_LINK: ${{ secrets.CERTIFICATE }}
  CSC_KEY_PASSWORD: ${{ secrets.CERTIFICATE_PASSWORD }}
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
```

## Testing Builds

### Local Testing

After building, test the installer/app on the target platform:

1. Install the app
2. Verify launch
3. Test core functionality
4. Check file-based storage
5. Verify user data location
6. Test uninstall (ensure user data is preserved)

See [TESTING.md](TESTING.md) for detailed testing procedures.

### Smoke Tests

Perform basic smoke tests:

- **Windows**: Launch from shortcut, verify app opens, check functionality
- **macOS**: Drag app to Applications, launch from Spotlight, verify app opens
- **Linux**: Run AppImage/DEB, verify app launches

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md with release notes
3. Commit and push changes
4. Create git tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
5. Build packages:
   ```bash
   npm run dist:win
   npm run dist:mac
   npm run dist:linux
   ```
6. Upload artifacts to release server or GitHub Releases
7. Announce release to users

## Troubleshooting

### General Issues

#### Issue: Build fails with "ENOENT: no such file or directory"

**Solution**:
- Ensure you're in the project root directory
- Run `npm install` to ensure dependencies are installed
- Check that `electron-builder.yml` exists

#### Issue: Build artifacts too large

**Solution**:
- Enable ASAR archiving
- Exclude unnecessary files from the package
- Remove unused dependencies
- Minimize assets (compress images, etc.)

#### Issue: Icon not appearing in installer

**Solution**:
- Verify icon file exists in correct location
- Check icon file format and size
- Rebuild icon using proper tools

## Additional Resources

- [electron-builder Documentation](https://www.electron.build/)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [Electron Code Signing Guide](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [BUILD.md](BUILD.md) - Build guide
- [TESTING.md](TESTING.md) - Testing guide

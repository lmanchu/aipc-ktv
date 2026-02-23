# AIPC KTV Testing Guide

This guide covers manual testing procedures for AIPC KTV desktop application builds.

## Overview

Testing AIPC KTV involves verifying that the application:
- Installs correctly on each platform
- Launches and runs without errors
- Core functionality works as expected
- File-based storage operates correctly
- UI renders properly
- Windows (main and display) function correctly

## Testing Prerequisites

- Fresh installation of each target platform
- Two displays (for dual-screen testing)
- Network connection (for YouTube API)
- YouTube API key (configured in app or environment)

## Windows Testing

### Installation Testing

1. **Download the installer**:
   - Obtain `AIPC KTV_1.0.0_x64.exe` (for 64-bit Windows)
   - Obtain `AIPC KTV_1.0.0_ia32.exe` (for 32-bit Windows)

2. **Verify installer properties**:
   - Right-click installer → Properties
   - Check Digital Signature (if signed)
   - Verify file size (~80-100MB expected)
   - Verify file version matches expected (1.0.0)

3. **Run the installer**:
   - Double-click the installer
   - **NSIS Setup Dialog should appear** with:
     - Welcome screen with app name and version
     - "License Agreement" (if configured)
     - "Choose Install Location" option (since `oneClick: false`)
     - "Choose Components" (if configured)
     - "Start Menu Folder" selection
     - Additional tasks (Desktop shortcut, etc.)
     - Ready to Install summary
     - Installation progress
     - Completing screen

4. **Verify installation**:
   - Install path should default to: `C:\Users\<username>\AppData\Local\Programs\aipc-ktv\`
   - App shortcut should be created on Desktop (if `createDesktopShortcut: true`)
   - App shortcut should be created in Start Menu (if `createStartMenuShortcut: true`)
   - Verify app folder contains:
     - `resources/app.asar` (main application bundle)
     - `AIPC KTV.exe` (main executable)
     - Other required resources

5. **Test uninstall**:
   - Go to Settings → Apps → Installed apps
   - Find "AIPC KTV" and click "Uninstall"
   - **Verify user data is preserved** (since `deleteAppDataOnUninstall: false`):
     - Check `%APPDATA%\aipc-ktv\` for preserved data files
     - Verify playlists.json and queue.json still exist (if they existed)

### Launch Testing

1. **Launch from Desktop shortcut**:
   - Double-click "AIPC KTV" shortcut
   - App should launch in 3-5 seconds

2. **Launch from Start Menu**:
   - Open Start Menu → All Apps → AIPC KTV
   - App should launch successfully

3. **Launch from executable**:
   - Navigate to installation directory
   - Double-click `AIPC KTV.exe`
   - App should launch successfully

4. **Verify launch**:
   - No error dialogs or crash dialogs
   - Application window appears
   - Taskbar shows app icon
   - No console errors (check with Developer Tools if enabled)

### Functionality Testing

1. **UI Rendering**:
   - Control window displays correctly
   - Search panel shows input field
   - Queue panel displays (empty initially)
   - Playlist panel displays (empty initially)
   - All text is readable and not overlapping

2. **YouTube Integration**:
   - Enter search term in search bar
   - Verify search results appear
   - Click "Add to Queue" on a result
   - Verify song appears in queue

3. **Queue Management**:
   - Add multiple songs to queue
   - Verify queue displays in order
   - Click "Play" or "Next" button
   - Verify display window opens with video
   - Verify video plays correctly

4. **Dual-Screen Setup**:
   - Connect external monitor
   - Launch app
   - Verify control window appears on primary display
   - Verify display window appears on external monitor
   - Verify display window is fullscreen
   - Verify videos play on display window

5. **Playlist Management**:
   - Create new playlist
   - Save current queue as playlist
   - Load playlist to queue
   - Rename playlist
   - Delete playlist

6. **File-Based Storage**:
   - Create playlists
   - Add songs to queue
   - Close the app
   - Reopen the app
   - Verify playlists are restored
   - Verify queue is restored (if queue persistence is enabled)

### Performance Testing

1. **Cold Start**:
   - Close app completely
   - Launch and time to first window: < 5 seconds

2. **Memory Usage**:
   - Open Task Manager
   - Check memory usage after launch: < 200MB
   - Check memory usage after playing 10 songs: < 300MB

3. **CPU Usage**:
   - Idle CPU usage: < 5%
   - CPU usage during video playback: < 30%

## macOS Testing

### Installation Testing

1. **Download the DMG**:
   - Obtain `AIPC KTV_1.0.0_x64.dmg` (Intel Mac)
   - Obtain `AIPC KTV_1.0.0_arm64.dmg` (Apple Silicon Mac)

2. **Mount the DMG**:
   - Double-click the DMG file
   - Verify DMG mounts and opens
   - Finder window appears showing:
     - "AIPC KTV" app icon (drag to Applications)
     - Applications folder shortcut

3. **Install the app**:
   - Drag "AIPC KTV" icon to Applications folder
   - Wait for copy to complete (~10-30 seconds)
   - Eject the DMG
   - Open Applications folder
   - Verify "AIPC KTV" app bundle exists

4. **Verify app bundle structure**:
   - Right-click "AIPC KTV" → Show Package Contents
   - Verify Contents directory contains:
     - `Info.plist` (app metadata)
     - `MacOS/` (executable)
     - `Resources/` (icons and resources)
     - `Frameworks/` (Electron frameworks)

5. **First Launch (Gatekeeper)**:
   - Double-click app to launch
   - **If unsigned**: macOS may show security warning
     - Click "Cancel" or move to Trash (Gatekeeper protection)
     - Right-click → Open to bypass (development builds)
   - **If signed**: App launches normally

6. **Test uninstall**:
   - Drag app to Trash
   - Empty Trash
   - Verify user data is preserved (in `~/Library/Application Support/aipc-ktv/`)

### Launch Testing

1. **Launch from Applications folder**:
   - Double-click "AIPC KTV" in Applications
   - App should launch in 3-5 seconds

2. **Launch from Spotlight**:
   - Press Cmd+Space
   - Type "AIPC KTV"
   - Press Enter
   - App should launch successfully

3. **Launch from Dock**:
   - Drag app to Dock
   - Click Dock icon
   - App should launch (or bring to front if already running)

4. **Verify launch**:
   - No crash reports in Console app
   - Application menu bar appears (with app name)
   - Application window appears
   - Dock shows app icon with active indicator

### Functionality Testing

Perform the same functionality tests as Windows:
- UI Rendering
- YouTube Integration
- Queue Management
- Dual-Screen Setup
- Playlist Management
- File-Based Storage

### macOS-Specific Testing

1. **Permissions**:
   - Verify app can access network (YouTube API)
   - Verify app can write to user data directory
   - Check System Preferences → Security & Privacy for any blocked permissions

2. **Window Management**:
   - Cmd+Q should quit the app
   - Cmd+W should close window (may not quit app)
   - Cmd+M should minimize window
   - Cmd+, should open Settings (if implemented)
   - Cmd+H should hide app

3. **Menu Bar**:
   - App menu appears with app name
   - File menu (New, Open, Close, Quit)
   - Edit menu (Undo, Redo, Cut, Copy, Paste)
   - View menu (if implemented)
   - Window menu (Minimize, Zoom, Bring All to Front)
   - Help menu (if implemented)

### Performance Testing

Same as Windows:
- Cold Start: < 5 seconds
- Memory Usage: < 200MB after launch, < 300MB after playing 10 songs
- CPU Usage: < 5% idle, < 30% during playback

## Linux Testing

### Installation Testing

1. **Download the package**:
   - Obtain `AIPC KTV_1.0.0_x64.AppImage`
   - OR obtain `aipc-ktv_1.0.0_amd64.deb`

2. **Install AppImage**:
   - Make AppImage executable:
     ```bash
     chmod +x "AIPC KTV_1.0.0_x64.AppImage"
     ```
   - Run directly:
     ```bash
     ./AIPC\ KTV_1.0.0_x64.AppImage
     ```
   - OR integrate with system:
     ```bash
     ./AIPC\ KTV_1.0.0_x64.AppImage --appimage-extract
     sudo mv squashfs-root /opt/aipc-ktv
     sudo ln -s /opt/aipc-ktv/AppRun /usr/local/bin/aipc-ktv
     ```

3. **Install DEB package**:
   ```bash
   sudo dpkg -i aipc-ktv_1.0.0_amd64.deb
   ```
   - If dependencies are missing:
     ```bash
     sudo apt-get install -f
     ```

4. **Verify installation**:
   - App appears in application menu
   - Verify app binary exists in `/usr/bin/` or `/usr/local/bin/`
   - Verify app icon appears correctly

5. **Test uninstall**:
   - AppImage: Delete the AppImage file and extracted directory
   - DEB: `sudo apt-get remove aipc-ktv`
   - Verify user data is preserved (in `~/.config/aipc-ktv/`)

### Launch Testing

1. **Launch from application menu**:
   - Open application menu
   - Search for "AIPC KTV"
   - Click to launch

2. **Launch from terminal**:
   ```bash
   aipc-ktv
   ```
   - Verify app launches successfully
   - Check terminal for errors

3. **Launch from AppImage**:
   ```bash
   ./AIPC\ KTV_1.0.0_x64.AppImage
   ```
   - Verify app launches

### Functionality Testing

Perform the same functionality tests as Windows and macOS.

### Linux-Specific Testing

1. **Desktop Integration**:
   - Verify app icon appears in taskbar/dock
   - Verify right-click menu shows options (Quit, etc.)
   - Verify window decorations appear correctly

2. **Display Integration**:
   - Verify app respects display scaling
   - Verify app handles multiple monitors correctly
   - Verify app works with different window managers (GNOME, KDE, etc.)

3. **Permissions**:
   - Verify app can access network
   - Verify app can write to config directory
   - Check journalctl for any permission errors

## Cross-Platform Testing Checklist

### Core Features

- [ ] App installs without errors
- [ ] App launches without errors
- [ ] Control window displays correctly
- [ ] Display window (if connected) displays correctly
- [ ] YouTube search works
- [ ] Can add songs to queue
- [ ] Can play songs from queue
- [ ] Queue persists across restarts (if enabled)
- [ ] Playlists persist across restarts
- [ ] Can create, rename, delete playlists
- [ ] Dual-screen setup works correctly

### File-Based Storage

- [ ] App creates data directory on first launch
- [ ] Playlists saved to file
- [ ] Queue saved to file (if enabled)
- [ ] Data restored correctly on app restart
- [ ] No data corruption after app crash
- [ ] Storage errors handled gracefully

### UI/UX

- [ ] All text is readable
- [ ] Buttons respond to clicks
- [ ] Keyboard shortcuts work (if implemented)
- [ ] Window resizing works correctly
- [ ] Window positioning is correct
- [ ] No console errors (check DevTools)

### Performance

- [ ] Cold start < 5 seconds
- [ ] Memory usage reasonable (< 300MB)
- [ ] CPU usage reasonable (< 30% during playback)
- [ ] No memory leaks after extended use
- [ ] App remains responsive during playback

### Security

- [ ] No security warnings on launch (or expected warnings for unsigned apps)
- [ ] App respects system permissions
- [ ] No excessive network requests
- [ ] App data is isolated from other apps

## Testing Tools

### Windows

- **Task Manager**: Monitor CPU and memory usage
- **Event Viewer**: Check for application errors
- **Resource Monitor**: Monitor file and network activity
- **Process Explorer**: Detailed process information

### macOS

- **Activity Monitor**: Monitor CPU and memory usage
- **Console App**: View system and app logs
- **System Information**: Detailed system info
- **Instruments**: Advanced performance analysis (Xcode)

### Linux

- **htop**: Monitor CPU and memory usage
- **journalctl**: View system logs
- **strace**: Trace system calls
- **top**: Basic system monitoring

## Reporting Bugs

When reporting bugs, include:

1. **Platform**: Windows/macOS/Linux with version
2. **Architecture**: x64/arm64/ia32
3. **App Version**: 1.0.0 (or current version)
4. **Steps to Reproduce**: Detailed steps to reproduce the bug
5. **Expected Behavior**: What should happen
6. **Actual Behavior**: What actually happens
7. **Screenshots/Videos**: Visual evidence if applicable
8. **Logs**: Console output or log files
9. **Environment Details**:
   - OS version
   - Node.js version (if development)
   - Monitor setup (dual-screen testing)
   - Network status

## Automated Testing

For automated testing, see the test suite:
- Unit tests: `test/` directory
- Run tests: `npm test`
- Build tests: Included in CI/CD pipeline

## Continuous Integration

Automated builds and tests run on:
- Every push to main branch
- Every pull request
- Every tag (for releases)

Check CI/CD status on GitHub Actions or similar platform.

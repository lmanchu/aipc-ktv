# AIPC KTV - Patlabor Development Spec

**Project**: AIPC KTV - Open Source Karaoke Platform
**Type**: Electron Desktop App (Windows/macOS/Linux)
**Timeline**: 4 weeks MVP
**License**: MIT
**Goal**: Showcase AIPC dual-screen capability with YouTube-based karaoke

---

## Story Title
Build open-source dual-screen KTV app for AIPC using Electron + YouTube IFrame API

---

## Story Description

Create a desktop karaoke application that leverages AIPC's dual-screen setup to provide a professional KTV experience. When users connect an external monitor, the PC screen serves as the song selection and queue management interface, while the large external display shows the music video in fullscreen.

**Key Requirements**:
- ✅ **YouTube IFrame API** for legal video playback (no download)
- ✅ **YouTube Data API v3** for song search
- ✅ **Dual-screen** architecture using Electron BrowserWindow
- ✅ **Queue management** with drag-and-drop, skip, replay
- ✅ **Playlist** creation and file-based persistent storage
- ✅ **SRT subtitle overlay** (optional, user-uploaded)
- ✅ **Auto-update mechanism** using electron-updater
- ✅ **Cross-platform packaging** (Windows .exe, macOS .dmg, Linux AppImage/DEB)

**Out of Scope (v2)**:
- ❌ AI subtitle generation (Whisper API)
- ❌ Vocal removal
- ❌ Cloud sync

---

## Tech Stack

```yaml
Framework: Electron 28+
Frontend: React 18 + Vite
State: Zustand
UI: Tailwind CSS + shadcn/ui components
YouTube:
  - IFrame Player API (video playback)
  - Data API v3 (search)
Storage: File-based (JSON files via IPC)
  - StorageService: Main process file I/O
  - Playlist Storage: playlists.json
  - Queue Storage: queue.json (optional)
  - Preference Store: User preferences
Subtitle: Custom SRT parser + HTML5 Video Track
Build: electron-builder (cross-platform)
Auto-Update: electron-updater
Packaging:
  - Windows: NSIS installer (.exe)
  - macOS: DMG disk image (.dmg) + ZIP
  - Linux: AppImage + DEB package
```

---

## Project Structure

```
aipc-ktv/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # App entry, dual-window setup
│   │   ├── storage.ts        # File-based storage service
│   │   ├── update.ts         # Auto-update handlers
│   │   └── preload/          # Preload scripts
│   │       └── index.ts      # IPC and API exposure
│   ├── renderer/             # React UI
│   │   ├── windows/
│   │   │   ├── control/      # PC screen - control interface
│   │   │   │   ├── SearchPanel.tsx
│   │   │   │   ├── QueuePanel.tsx
│   │   │   │   └── PlaylistPanel.tsx
│   │   │   └── display/      # External screen - video player
│   │   │       ├── VideoPlayer.tsx
│   │   │       └── SubtitleOverlay.tsx
│   │   ├── store/            # Zustand stores
│   │   │   ├── queueStore.ts
│   │   │   ├── playlistStore.ts
│   │   │   └── preferenceStore.ts
│   │   ├── services/         # Storage services
│   │   │   ├── playlistStorage.ts
│   │   │   └── queueStorage.ts
│   │   └── lib/
│   │       ├── youtube.ts    # YouTube API wrapper
│   │       └── srt-parser.ts # SRT subtitle parser
│   └── shared/               # Shared types
│       └── types.ts
├── docs/                     # Documentation
│   ├── BUILD.md              # Build guide
│   ├── PACKAGING.md          # Packaging guide
│   └── TESTING.md            # Testing guide
├── test/                     # Test files
│   └── story-*.test.ts       # Story-specific tests
├── electron-builder.yml      # Electron builder configuration
├── package.json
├── README.md
└── PATLABOR_SPEC.md
```

---

## Milestones (4 Weeks)

### Week 1: Foundation + Dual-Screen Setup
**Goal**: Electron app with dual-screen architecture + YouTube IFrame integration

**Tasks**:
1. Initialize Electron + React + Vite project
2. Configure electron-builder for cross-platform build
3. Implement dual BrowserWindow setup:
   - Control window (800x600, resizable)
   - Display window (fullscreen on secondary display)
4. Set up IPC communication between windows
5. Integrate YouTube IFrame Player API
6. Test basic video playback on display window

**Acceptance Criteria**:
- ✅ App opens two windows when external monitor connected
- ✅ Can play YouTube video by ID on display window
- ✅ Control window can send commands to display window via IPC
- ✅ Cross-platform build works (Windows + macOS)

---

### Week 2: Search + Queue Management
**Goal**: YouTube search + queue system with drag-and-drop

**Tasks**:
1. Implement YouTube Data API v3 integration
2. Build search interface in control window:
   - Search input with debounce
   - Results grid with thumbnails
   - "Add to Queue" button
3. Create queue management panel:
   - Display current queue
   - Drag-and-drop reordering (react-beautiful-dnd)
   - Skip / Remove / Replay buttons
4. Connect queue to video player:
   - Auto-play next in queue
   - Update queue state on video end
5. Implement Zustand store for queue state

**Acceptance Criteria**:
- ✅ Can search YouTube for songs by name
- ✅ Search results show title, channel, duration, thumbnail
- ✅ Can add songs to queue with one click
- ✅ Queue displays current song + upcoming songs
- ✅ Can reorder queue via drag-and-drop
- ✅ Videos auto-play in sequence
- ✅ Can skip to next song

---

### Week 3: Playlist System + File-Based Storage
**Goal**: Create, save, and load playlists with file-based persistent storage

**Tasks**:
1. Design playlist data model:
    ```typescript
    interface Playlist {
      id: string
      name: string
      songs: Song[]
      createdAt: number
    }

    interface Song {
      videoId: string
      title: string
      channel: string
      thumbnail: string
    }
    ```
2. Implement file-based storage service:
    - Create StorageService class in main process
    - Read/write JSON files to userData directory
    - Handle file operations with async/await
    - Add error handling and validation
3. Implement IPC handlers for storage:
    - Expose storage operations via IPC
    - Add type-safe interfaces for renderer process
    - Handle errors gracefully
4. Implement playlist CRUD operations:
    - Create new playlist
    - Add current queue to playlist
    - Load playlist to queue
    - Delete playlist
5. Migrate playlist store to file-based storage:
    - Remove persist middleware from Zustand store
    - Add save operations on mutations
    - Add load operation on app startup
6. Build playlist UI in control window:
    - Playlist sidebar
    - Playlist detail view
    - "Save Queue as Playlist" button
7. Implement queue persistence (optional):
    - Add preference to enable/disable queue persistence
    - Save queue to file on mutations (if enabled)
    - Load queue on app startup (if enabled)

**Acceptance Criteria**:
- ✅ Can create new playlist with custom name
- ✅ Can save current queue as playlist
- ✅ Can load playlist to queue (replace or append)
- ✅ Playlists persist across app restarts (file-based)
- ✅ Can rename/delete playlists
- ✅ UI shows playlist count and total songs
- ✅ Storage service handles file operations correctly
- ✅ IPC handlers expose storage operations
- ✅ Queue persistence can be enabled/disabled via preferences

---

### Week 4: SRT Subtitle + Packaging + Auto-Update
**Goal**: Subtitle overlay system + cross-platform packaging + auto-update mechanism

**Tasks**:
1. Implement SRT parser:
    - Parse SRT format
    - Convert to subtitle objects with timing
2. Build subtitle overlay component:
    - Centered text on display window
    - Synced with video playback time
    - Configurable font size/color
3. Add subtitle controls in control window:
    - Upload SRT file button
    - Enable/disable subtitles
    - Adjust subtitle timing offset
4. UI/UX polish:
    - Add app icon
    - Improve control window layout
    - Add keyboard shortcuts (Space = play/pause, N = next)
5. Configure electron-builder for cross-platform packaging:
    - Windows: NSIS installer with x64/ia32 support
    - macOS: DMG and ZIP with x64/arm64 support
    - Linux: AppImage and DEB with x64 support
6. Implement auto-update mechanism:
    - Configure electron-updater
    - Add update handlers in main process
    - Add update UI in renderer process
    - Expose update API via IPC
7. Create documentation:
    - README.md: Overview, features, quick start
    - BUILD.md: Build instructions for all platforms
    - docs/PACKAGING.md: Detailed packaging configuration
    - TESTING.md: Testing procedures and guidelines
8. Build and test installers:
    - Test Windows installer
    - Test macOS DMG
    - Test Linux AppImage/DEB
9. Create GitHub release with installers

**Acceptance Criteria**:
- ✅ Can upload SRT file for current song
- ✅ Subtitles display in sync with video
- ✅ Can adjust subtitle timing offset (±5s)
- ✅ Subtitles are visually clear (stroke + shadow)
- ✅ Control window has polished UI
- ✅ Windows installer (.exe) works with custom install path
- ✅ macOS DMG (.dmg) works with drag-and-drop install
- ✅ Linux AppImage and DEB work correctly
- ✅ Auto-update mechanism is configured
- ✅ Documentation is complete and accurate
- ✅ README includes storage and packaging info
- ✅ docs/PACKAGING.md has detailed packaging guide
- ✅ GitHub repo is public with MIT license

---

## API Requirements

### YouTube Data API v3
**Purpose**: Search for songs
**Endpoint**: `GET https://www.googleapis.com/youtube/v3/search`
**Parameters**:
- `q`: search query (song name)
- `type`: video
- `part`: snippet
- `maxResults`: 10
- `key`: API key

**Setup**:
1. Create Google Cloud project
2. Enable YouTube Data API v3
3. Create API key (restrict to YouTube Data API)
4. Store in `.env` file (not committed)

### YouTube IFrame Player API
**Purpose**: Play videos on display window
**Docs**: https://developers.google.com/youtube/iframe_api_reference
**No API key required** (public API)

---

## Development Guidelines for Patlabor

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Functional components only (React)
- Use Zustand for state (not Context API)
- Async/await for all file operations

### File-Based Storage
- Use StorageService for all file operations
- Store data in platform-specific userData directory
- Implement IPC handlers for renderer process access
- Handle errors gracefully (log errors, continue operations)
- Use singleton pattern for storage services

### Testing
- Write unit tests for storage services
- Write integration tests for store mutations
- Manual testing on dual-screen setup
- Test on Windows 11, macOS 14, and Linux

### Git Workflow
1. Create repo: `aipc-ktv`
2. Commit after each milestone
3. Tag releases: `v1.0.0-mvp`
4. Use feature branches for development

### Error Handling
- Graceful fallback if no external monitor
- Show error toast if YouTube API fails
- Validate SRT format before parsing
- Catch and log storage errors, don't crash app
- Handle file not found errors gracefully

---

## Deliverables

### Code
- ✅ GitHub repo: `lmanchu/aipc-ktv`
- ✅ MIT License
- ✅ Clean commit history (4 major commits for 4 weeks)
- ✅ File-based storage implementation
- ✅ Auto-update mechanism
- ✅ Cross-platform packaging configuration

### Documentation
- ✅ README.md with:
  - Overview and features
  - Quick start guide
  - File-based storage info
  - Packaging and auto-update info
  - Installation instructions
  - YouTube API setup
  - Screenshot/GIF
- ✅ BUILD.md with:
  - Prerequisites for all platforms
  - Build scripts documentation
  - Platform-specific build details
  - Troubleshooting section
- ✅ docs/PACKAGING.md with:
  - Detailed packaging configuration
  - Windows, macOS, Linux packaging details
  - Auto-update configuration
  - CI/CD integration examples
- ✅ TESTING.md with:
  - Installation testing procedures
  - Launch testing procedures
  - Functionality testing checklist
  - Platform-specific testing
  - Bug reporting template
- ✅ CONTRIBUTING.md (basic guidelines)
- ✅ LICENSE (MIT)

### Releases
- ✅ Windows installer (.exe) with x64 and ia32 support
- ✅ macOS DMG (.dmg) with Intel and Apple Silicon support
- ✅ Linux AppImage and DEB package with x64 support
- ✅ GitHub Release v1.0.0-mvp
- ✅ Auto-update support configured

---

## Success Criteria

**Functional**:
- ✅ App opens dual-screen KTV interface
- ✅ Can search YouTube and build queue
- ✅ Videos play automatically in sequence
- ✅ Can save/load playlists (file-based storage)
- ✅ Queue persistence (optional, user-controlled)
- ✅ Subtitles work when SRT file uploaded
- ✅ Auto-update mechanism configured
- ✅ Cross-platform packaging works

**Non-Functional**:
- ✅ Cross-platform (Windows + macOS + Linux)
- ✅ Smooth 60fps video playback
- ✅ App size < 200MB
- ✅ Clean, modern UI
- ✅ Reliable file-based storage
- ✅ Professional installation experience

**Strategic**:
- ✅ Demonstrates AIPC dual-screen value
- ✅ Suitable for IrisGo preinstall consideration
- ✅ Zero legal risk (open source + YouTube IFrame API)
- ✅ Production-ready packaging and auto-update

---

## Notes for Patlabor

- **Priority**: Speed over perfection (4 weeks strict)
- **YouTube API Key**: Use placeholder in code, document in README
- **Design**: Minimize custom CSS, use Tailwind utilities
- **Focus**: Core functionality first, polish in Week 4
- **Storage**: Use file-based storage (not localStorage or in-memory Yjs)
- **Packaging**: Configure electron-builder for all platforms
- **Auto-Update**: Set up electron-updater (publish field can be null for dev)
- **Documentation**: Create comprehensive documentation (README, BUILD, PACKAGING, TESTING)

---

**Last Updated**: 2026-02-24
**Created By**: Claude Code + Lman
**Target Start**: Tonight (Patlabor overnight execution)

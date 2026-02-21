# AIPC KTV - Patlabor Development Spec

**Project**: AIPC KTV - Open Source Karaoke Platform
**Type**: Electron Desktop App (Windows/macOS)
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
- ✅ **Playlist** creation and local storage
- ✅ **SRT subtitle overlay** (optional, user-uploaded)

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
Storage: localStorage (playlists)
Subtitle: Custom SRT parser + HTML5 Video Track
Build: electron-builder (cross-platform)
```

---

## Project Structure

```
aipc-ktv/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # App entry, dual-window setup
│   │   └── ipc-handlers.ts   # IPC communication
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
│   │   │   └── playlistStore.ts
│   │   └── lib/
│   │       ├── youtube.ts    # YouTube API wrapper
│   │       └── srt-parser.ts # SRT subtitle parser
│   └── shared/               # Shared types
├── electron-builder.yml
├── package.json
└── README.md
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

### Week 3: Playlist System
**Goal**: Create, save, and load playlists locally

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
2. Implement playlist CRUD operations:
   - Create new playlist
   - Add current queue to playlist
   - Load playlist to queue
   - Delete playlist
3. Build playlist UI in control window:
   - Playlist sidebar
   - Playlist detail view
   - "Save Queue as Playlist" button
4. Persist playlists to localStorage
5. Implement Zustand store for playlist state

**Acceptance Criteria**:
- ✅ Can create new playlist with custom name
- ✅ Can save current queue as playlist
- ✅ Can load playlist to queue (replace or append)
- ✅ Playlists persist across app restarts
- ✅ Can rename/delete playlists
- ✅ UI shows playlist count and total songs

---

### Week 4: SRT Subtitle + Polish
**Goal**: Subtitle overlay system + UI polish + packaging

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
5. Create README with:
   - Installation instructions
   - YouTube API key setup guide
   - Screenshot/demo GIF
6. Package for Windows/macOS using electron-builder
7. Create GitHub release with installers

**Acceptance Criteria**:
- ✅ Can upload SRT file for current song
- ✅ Subtitles display in sync with video
- ✅ Can adjust subtitle timing offset (±5s)
- ✅ Subtitles are visually clear (stroke + shadow)
- ✅ Control window has polished UI
- ✅ README includes setup guide
- ✅ Windows installer (.exe) works
- ✅ macOS app bundle (.dmg) works
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

### Testing (Optional for MVP)
- Manual testing on dual-screen setup
- Test on Windows 11 + macOS 14

### Git Workflow
1. Create repo: `aipc-ktv`
2. Commit after each milestone
3. Tag releases: `v1.0.0-mvp`

### Error Handling
- Graceful fallback if no external monitor
- Show error toast if YouTube API fails
- Validate SRT format before parsing

---

## Deliverables

### Code
- ✅ GitHub repo: `lmanchu/aipc-ktv`
- ✅ MIT License
- ✅ Clean commit history (4 major commits for 4 weeks)

### Documentation
- ✅ README.md with:
  - Feature list
  - Installation guide
  - YouTube API setup
  - Screenshot/GIF
- ✅ CONTRIBUTING.md (basic guidelines)
- ✅ LICENSE (MIT)

### Releases
- ✅ Windows installer (.exe)
- ✅ macOS app bundle (.dmg)
- ✅ GitHub Release v1.0.0-mvp

---

## Success Criteria

**Functional**:
- ✅ App opens dual-screen KTV interface
- ✅ Can search YouTube and build queue
- ✅ Videos play automatically in sequence
- ✅ Can save/load playlists
- ✅ Subtitles work when SRT file uploaded

**Non-Functional**:
- ✅ Cross-platform (Windows + macOS)
- ✅ Smooth 60fps video playback
- ✅ App size < 200MB
- ✅ Clean, modern UI

**Strategic**:
- ✅ Demonstrates AIPC dual-screen value
- ✅ Suitable for IrisGo preinstall consideration
- ✅ Zero legal risk (open source + YouTube IFrame API)

---

## Notes for Patlabor

- **Priority**: Speed over perfection (4 weeks strict)
- **YouTube API Key**: Use placeholder in code, document in README
- **Design**: Minimize custom CSS, use Tailwind utilities
- **Focus**: Core functionality first, polish in Week 4

---

**Last Updated**: 2026-02-21
**Created By**: Claude Code + Lman
**Target Start**: Tonight (Patlabor overnight execution)

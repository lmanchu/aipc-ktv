# AIPC KTV

Open-source dual-screen karaoke app for AIPC. Browse YouTube, build a queue, and sing along with subtitles on a second display.

## Architecture

```
Control Window          Main Process (IPC)        Display Window
┌──────────────┐       ┌──────────────┐          ┌──────────────┐
│ YouTube      │       │ play-video   │          │ YouTube      │
│ <webview>    │──────>│ navigates    │─────────>│ embed iframe │
│ + Queue btn  │       │ display URL  │          │ + subtitle   │
│              │       │              │          │   bar        │
│ Queue list   │       │ subtitle     │          │              │
│ Playlist     │       │ cache (SRT)  │          │              │
└──────────────┘       └──────────────┘          └──────────────┘
```

- **Control Window**: Embedded YouTube browser via `<webview>`. Click any video to add to queue. Toolbar with queue management and skip button.
- **Display Window**: Fullscreen YouTube playback via iframe embed + subtitle bar at bottom. Auto-opens on external display when available.
- **Click Interception**: Video clicks on YouTube search results are intercepted — songs are added to queue without navigating into the video page.
- **Subtitle Cache**: SRT files cached locally in `{userData}/subtitles/` — fetch once, play forever.

## Stack

- Electron + Vite + React + TypeScript
- Zustand (state management)
- Tailwind CSS
- YouTube embed (no API key required)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## License

MIT

# 🎵 MusicBox

> A modern, ultra-low-memory local desktop music player inspired by **Feishin**, built with **Tauri v2 (Rust Core)**, **React 19**, **TypeScript**, and **Tailwind CSS**.

---

## ⚡ Highlights & Architecture

- **Ultra-Low Memory Footprint (~35MB–65MB RAM)**: 
  - Uses **Tauri v2** with a native Rust backend instead of heavy Electron (~250MB–350MB).
  - Audio files are streamed in lightweight 64KB byte-range chunks (`Range: bytes=...`) with CORS headers for direct connection to the Web Audio API without loading whole tracks into memory.
  - Native file metadata scanning via `lofty` in Rust reads only audio headers and discards audio frames, parsing thousands of songs in seconds.
  - Embedded **SQLite** database with WAL mode and strict 2MB cache limits.
- **Feishin UI Fidelity**:
  - Dark slate/charcoal aesthetic, glassmorphic surfaces, responsive virtualized track tables with audio format badges (`FLAC 24-bit`, `MP3 320k`).
  - Left navigation sidebar, searchable library, album card grids with hover play, artist discography pages, and persistent bottom player bar.
  - Frameless window with custom minimize, maximize/restore, and close buttons.
- **Online Synced Lyrics (LRCLIB)**:
  - Synchronized karaoke lyrics with real-time active line highlighting, smooth auto-centering scroll, and click-to-seek functionality.
  - Plain lyrics toggle and offline caching.
- **Discord Rich Presence**:
  - Shows current song title, artist, album, and **release year** (e.g. `1989 (2014)`).
  - Live elapsed / remaining time progress bar inside Discord profiles.
  - Automatic online album artwork resolution from **iTunes (1000x1000 HD)**, **JioSaavn**, and **Last.fm**.
  - Customizable source priority and toggles in Settings.
- **Last.fm Scrobbler & Metadata Enrichment**:
  - Automatically updates "Now Playing" and scrobbles at 50% or 240s playback.
  - Enriches missing artist biographies, album summaries, tags, and similar artists.
- **Custom Themes & Audio Visualizers**:
  - Themes: **Feishin Dark**, **AMOLED Pure Black** (ultra-low GPU RAM), **Nord Frost**, **Catppuccin Mocha**, and **Cyberpunk Neon**.
  - Real-time 60 FPS Canvas Audio Visualizers: **Frequency Spectrum Bars**, **Oscilloscope Waveform**, and **Circular Spectrum** (automatically halts animation and frees CPU when paused or hidden).

---

## 🚀 Getting Started

### Development Mode
To run the desktop application in live development mode with hot-reloading:

```bash
npm run tauri dev
```

### Production Build
To build the standalone Windows executable (`.exe`) / installer:

```bash
npm run tauri build
```

The compiled binary will be placed in `src-tauri/target/release/`.

---

## 📁 Project Structure

```
MusicBox/
├── src/                          # Frontend (React 19 + TypeScript + Tailwind)
│   ├── components/               # Feishin UI Components
│   │   ├── TitleBar.tsx          # Frameless custom header & search
│   │   ├── Sidebar.tsx           # Library navigation & playlist manager
│   │   ├── PlayerBar.tsx         # Bottom player bar & timeline slider
│   │   ├── TrackTable.tsx        # Virtualized song list with format tags
│   │   ├── AlbumGrid.tsx         # Album cover card grid
│   │   ├── AlbumDetailView.tsx   # Detailed album tracklist & wiki
│   │   ├── ArtistView.tsx        # Artist bio, discography & top songs
│   │   ├── Visualizer.tsx        # 60 FPS canvas frequency & wave visualizer
│   │   ├── LyricsDrawer.tsx      # Synced karaoke lyrics (LRCLIB)
│   │   ├── TrackInfoDrawer.tsx   # Audio specs & Last.fm artist bio
│   │   ├── QueueDrawer.tsx       # Up next play queue
│   │   └── SettingsModal.tsx     # Discord RPC, Last.fm, theme & art priority
│   ├── services/
│   │   ├── audioEngine.ts        # HTML5 Audio + Web Audio AnalyserNode
│   │   ├── tauriBridge.ts        # IPC bridge to Rust backend
│   │   ├── lyricsService.ts      # LRCLIB synced lyrics fetcher
│   │   ├── metadataService.ts    # Multi-source metadata (iTunes, JioSaavn, Last.fm)
│   │   └── lastfmScrobbler.ts    # Last.fm scrobbler & Now Playing updates
│   ├── types/music.ts            # TypeScript interfaces
│   └── App.tsx                   # Main state & view controller
│
└── src-tauri/                    # Native Rust Engine (Tauri v2)
    ├── src/
    │   ├── server.rs             # Local byte-range streaming server with CORS
    │   ├── scanner.rs            # Fast audio tag parser using `lofty`
    │   ├── db.rs                 # Embedded SQLite database (WAL mode)
    │   ├── discord.rs            # Native Discord Rich Presence IPC client
    │   ├── commands.rs           # Tauri IPC commands
    │   └── lib.rs                # Application builder & plugins
    ├── Cargo.toml
    └── tauri.conf.json
```

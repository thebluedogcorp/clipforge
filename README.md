<div align="center">

# 🎬 ClipForge

### AI Video Clipper & Caption Studio

**Create clips, transcribe, caption, and export — all locally on your machine.**

[![Release](https://img.shields.io/github/v/release/thebluedogcorp/clipforge?style=flat-square&color=10b981)](https://github.com/thebluedogcorp/clipforge/releases)
[![License](https://img.shields.io/badge/license-Proprietary-red?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square)](#download)

</div>

---

## 📥 Download & Run

1. Go to [**Releases**](https://github.com/thebluedogcorp/clipforge/releases)
2. Download the archive for your platform:
   | Platform | File |
   |----------|------|
   | Windows | `clipforge-windows-x64.zip` |
   | macOS | `clipforge-macos-x64.tar.gz` |
   | Linux | `clipforge-linux-x64.tar.gz` |
3. **Extract** the archive to any folder
4. **Run** `clipforge.exe` (Windows) or `./clipforge` (macOS/Linux)
5. Your browser opens automatically at `http://localhost:3000`

> **Requirements**: [Node.js](https://nodejs.org) 18+ must be installed on your
> system (the launcher uses it to run the server). Your video files never leave
> your machine.

---

## ✨ Features

### 🎬 Video Clipping
- **Multi-source**: Upload a local file or paste a YouTube URL
- **Full timeline**: Drag-to-create, move, resize, and reorder clips
- **Auto-split**: Generate N clips of X seconds with even or back-to-back spacing
- **Merge & Split**: Combine adjacent clips or split at the playhead
- **In/Out marks**: Pro-style I/O marking with keyboard shortcuts

### 🤖 AI-Powered
- **Transcription**: Speech-to-text via ASR — extracts audio and transcribes
- **AI Captions**: LLM-generated timed captions (3–7 words each, covering full duration)
- **4 Caption Styles**: Bold, Minimal, Karaoke, Boxed
- **Caption Editor**: Custom color, font size, vertical position
- **Caption Burn-in**: Embed captions directly into exported video

### 🎨 3D Device Mockups
Realistic 3D mockups with live video texture:
- 📱 iPhone 15 Pro (Dynamic Island, camera bump)
- 📱 Android Pixel (punch-hole, camera bar)
- 📱 iPad Pro
- 🖥️ Desktop Monitor (with neck + base)
- 📺 Smart TV (with legs + power LED)
- 📸 Story / Reels frame (with UI overlays)

### 📤 Export & Compilation
- **Formats**: MP4, WebM, GIF, MP3, SRT
- **Aspect Ratios**: 16:9, 9:16 (vertical), 1:1 (square), 4:5 (portrait)
- **Stitch Mode**: Compile all clips into one video
- **17 Crossfade Transitions**: Fade, Dissolve, Wipe, Slide, Circle, Radial, Smooth, Wind, V-Slide, H-Slide
- **Background Music**: Mix an audio track with volume control + live preview
- **Watermark/Logo**: Image overlay with 5 positions, size & opacity control
- **Video Filters**: 8 presets (Vivid, Warm, Cool, B&W, Vintage, Dream, Sharp) + 5 manual sliders (brightness, contrast, saturation, grayscale, blur)

### ⌨️ Pro Controls
- **Keyboard Shortcuts**: J/K/L shuttle, I/O marks, Space play/pause, Shift+1-9 jump to clip
- **Playback Speed**: 0.25× to 2×
- **Loop Region**: Loop a clip or custom range
- **Project Persistence**: Auto-save to IndexedDB — survive reloads

### 🎵 Audio
- **Real Waveform**: WebAudio-decoded audio envelope on the timeline
- **Mini Waveforms**: Per-clip waveform inside timeline regions + clip cards
- **Caption Burn-in**: Styled captions rendered directly into exported video

---

## 🔒 Privacy & Security

ClipForge is **local-first**:
- ✅ All video processing happens in your browser via ffmpeg.wasm
- ✅ Your video files never leave your machine
- ✅ Only AI transcription/caption calls go to the cloud
- ✅ No telemetry, no tracking, no data collection

---

## 🏗️ For Users

ClipForge is distributed as a **binary-only** product. The source code is
private and not publicly available. If you encounter bugs or have feature
requests, please [open an issue](https://github.com/thebluedogcorp/clipforge/issues).

---

## 📋 System Requirements

- **OS**: Windows 10+, macOS 11+, or Ubuntu 20.04+
- **RAM**: 4 GB minimum (8 GB recommended for large videos)
- **Browser**: A modern browser (Chrome, Firefox, Edge, Safari)
- **Disk**: ~200 MB for the app + space for your video files

---

## 📄 License

This software is proprietary. The binary is free to use. The source code
is not publicly available. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with ⚡ by ClipForge**

[Report Bug](https://github.com/thebluedogcorp/clipforge/issues) ·
[Request Feature](https://github.com/thebluedogcorp/clipforge/issues) ·
[Releases](https://github.com/thebluedogcorp/clipforge/releases)

</div>

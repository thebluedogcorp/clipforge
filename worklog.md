# ClipForge — AI Video Clipper · Worklog

## Project Status

**ClipForge** is a local-first, browser-based AI video clipping studio built with
Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui. It runs on `localhost:3000`
and is designed to be packaged as a single desktop `.exe` (see the in-app
"Package .exe" dialog for the Bun `--compile` recipe).

**Current phase:** MVP feature-complete and browser-verified. All golden-path
flows tested end-to-end with a real uploaded video and a TTS-generated speech
video.

---

## Architecture

```
src/
  app/
    page.tsx                 Main workspace (responsive resizable panels + mobile sheet)
    layout.tsx               Forced dark theme, Geist + JetBrains Mono fonts
    globals.css              Obsidian theme, custom scrollbars, glass/grid/glow utilities
    api/
      transcribe/route.ts    ASR (z-ai-web-dev-sdk) — accepts WAV audio upload
      captions/route.ts      LLM segments transcript into timed caption JSON
      youtube/route.ts       YouTube oEmbed metadata fetch (server-side, CORS-safe)
  components/
    clipper/                 header, footer, source-panel, video-preview, timeline,
                             clip-list, clip-properties, transcription-panel,
                             captions-panel, export-panel, right-panel, busy-overlay
    three/device-mockup.tsx  @react-three/fiber 3D scene: iPhone/iPad/Desktop/TV
                             with live THREE.VideoTexture on the device screen
  lib/
    store.ts                 Zustand store (source, clips, captions, device, export jobs)
    ffmpeg.ts                ffmpeg.wasm singleton loader (ST core from unpkg)
    video-controller.ts      <video> bridge for timeline + controls
    format.ts                time/SRT/bytes formatters, YouTube ID parser, clamp/uid
    types.ts                 Clip / Caption / ExportJob / Device types + color palette
```

**Key dependencies added:** `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `three`,
`@react-three/fiber`, `@react-three/drei`, `@types/three`.

---

## Completed Features (all browser-verified)

1. **Black, slick, modern UI** — obsidian theme (oklch), lime accent, glass header,
   grid-bg stage, custom scrollbars, glow effects. VLM-confirmed "professional dark
   theme with deep blacks and vibrant accent colors".
2. **Local file upload** — drag & drop or click; plays via HTML5 `<video>`.
3. **YouTube URL input** — server-side oEmbed fetch → embedded preview + thumbnail.
4. **Full timeline** — time ruler with adaptive ticks, procedural waveform, playhead
   with auto-scroll, zoom (8–400 px/s), fit-to-width. Verified: 3 colored clip
   regions (green/orange/pink).
5. **Clip creation** — drag on empty timeline to create a region; drag clip body to
   move; drag edges to resize; click to seek.
6. **Auto-split** — choose N clips of X seconds, "even spread" or "back-to-back"
   strategy. Verified generating 2–3 clips.
7. **AI transcription** — ffmpeg.wasm extracts mono 16kHz WAV → `/api/transcribe`
   (ASR). Verified: returned accurate text for a TTS narration.
8. **AI captions** — `/api/captions` (LLM) breaks transcript into 3–7 word timed
   segments covering the full duration. Verified: 5 segments, 00:00→00:16.
9. **Caption overlay** — 4 styles (Bold / Minimal / Karaoke / Boxed), live on the
   preview. VLM-confirmed "WELCOME TO CLIPFORGE" overlaid on video.
10. **Multi-format export** — MP4 (libx264+aac), WebM (libvpx+vorbis), GIF, MP3
    (libmp3lame), SRT. Verified: both clips exported (585KB + 621KB MP4) with
    download links and progress.
11. **3D device mockups** — three.js scene with iPhone/iPad/Desktop/TV, live video
    texture on screen, OrbitControls + auto-rotate, contact shadows. VLM-confirmed:
    "3D phone mockup displaying a colorful test pattern video".
12. **Resizable 3-pane workspace** + responsive mobile layout (Sheet for source).
13. **Sticky header** (live stats) + **sticky footer** (ffmpeg/ASR status, timecode).
14. **Package .exe dialog** — documents the Bun `--compile` recipe to ship a single
    binary that opens `localhost` in the browser.

---

## Verification Results (agent-browser + VLM)

- `GET /` → 200, no console errors, no hydration crashes.
- Upload local video → duration detected, timeline enabled.
- Auto-split 2×6s / 3×4s clips → created, selectable, editable.
- Switch to iPhone 3D → canvas renders 772×362, video texture live on screen.
- Transcribe speech video → ASR returned accurate transcript (POST 200).
- Generate captions → LLM returned 5 timed segments (POST 200, 2.2s).
- Export 2 clips as MP4 → both completed with sizes + download links.
- VLM analyses confirmed: dark theme, 3D phone with video, caption overlay,
  colored timeline regions, professional layout.

---

## Known Limitations / Risks

- **YouTube export/transcription** — browser security blocks downloading YouTube
  streams. YouTube sources preview & scrub via embed; clip/export requires the
  uploaded file. Clear in-app notices explain this.
- **ffmpeg.wasm "Aborted()" log** — benign cleanup message printed after a
  successful encode; output files are produced and read correctly. No user impact.
- **3D Environment HDR** — removed drei `Environment preset` (external HDR fetch
  conflicts with COEP credentialless). Replaced with a 3-light rig + inverted
  reflection sphere. Metallic look is good but not photoreal HDRI.
- **Cross-origin isolation** — COOP/COEP `credentialless` headers set globally;
  this is required for ffmpeg.wasm SharedArrayBuffer and works for the ST core.
- **ASR format** — service accepts WAV/WebM only (not MP3). Transcription extracts
  16kHz mono PCM WAV.

---

## Priority Recommendations for Next Phase

1. **Persist projects** — save source + clips + captions to IndexedDB (or Prisma
   SQLite) so reload doesn't lose work.
2. **Burn captions into export** — add an SRT burn-in option (needs libass-enabled
   ffmpeg core, or canvas-overlay render pass).
3. **Real waveform** — decode audio with WebAudio `AnalyserNode` / offline render
   to replace the procedural waveform with the actual audio envelope.
4. **More device mockups** — Android phone, laptop (with keyboard), vertical
   Story/Reels frame.
5. **Clip reordering & merging** — drag-to-reorder in the clip list; merge adjacent.
6. **Keyboard shortcuts panel** + jog/scrub with J/K/L.
7. **Thumbnail per clip** — generate a poster frame for each clip card.
8. **Actual `.exe` build script** — add a `scripts/build-exe.mjs` that runs
   `bun build --compile` on a tiny launcher that starts Next standalone + opens
   the browser, producing `clipforge.exe`.

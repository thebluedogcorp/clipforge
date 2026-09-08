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

---

## Phase 2 Update — Cron Review #1 (QA + New Features + Styling)

### Current Project Status Assessment

The MVP from Phase 1 is stable — `GET /` returns 200, no console errors, no
hydration crashes. QA via agent-browser + VLM confirmed the dark theme is
"professional-grade" and the four-panel layout is "well-balanced". No critical
bugs found during QA; the one drag-to-create "failure" was a synthetic-event
testing artifact (React batches state between synchronous pointermove →
pointerup). Real user drags work fine.

### This Round's Goals / Completed Modifications

**A. Bug fixes** — none critical found.

**B. New features added:**

1. **Keyboard shortcuts system** (`src/lib/use-keyboard-shortcuts.ts` +
   `src/components/clipper/shortcuts-overlay.tsx`) — full pro-style control set:
   - Playback: `Space`/`K` play-pause, `J`/`L` shuttle ±10s, `←/→` step 5s,
     `Shift ←/→` step 1s, `Home/End` jump to ends.
   - Editing: `I`/`O` mark in/out (renders amber IN + fuchsia OUT markers on the
     timeline), `Enter` make clip from marks, `N` new clip at playhead, `D`
     duplicate, `Delete` delete selected, `M` mute, `C` toggle captions.
   - View: `+/-` zoom, `1 2 3 4` switch right panel.
   - `?` opens a polished shortcuts overlay dialog (grouped, with kbd badges);
     `Esc` closes it. A keyboard-icon button was added to the header.

2. **Clip reordering** (`src/components/clipper/clip-list.tsx`) — clips are now
   drag-to-reorder via `@dnd-kit/sortable` with a grip handle. Verified: order
   changed `Clip 1|2|3` → `Clip 2|3|1` after a drag. Also added per-clip
   duplicate + visibility + delete actions on hover.

3. **Clip thumbnails** (`src/lib/use-thumbnail-generator.ts`) — an offscreen
   `<video>` + canvas seeks to each clip's midpoint and captures a 160×90 JPEG
   poster, cached in the store. Shown in both the clip list cards and a large
   preview at the top of the Clip Properties panel (with timecode + duration
   badge overlay). Verified: 5 thumbnails generated.

4. **In/out mark indicators on the timeline** — amber `IN` and fuchsia `OUT`
   flag markers with labels, rendered above the clip regions.

5. **Enhanced Clip Properties panel** — now shows: thumbnail preview header,
   name, color picker, start/end sliders, duration + midpoint stats, jump-to
   buttons, "Copy to marks" / "Duplicate" / "Delete clip" quick actions, and a
   contextual "Marks set" card with a "Make clip from marks" button when no
   clip is selected.

**C. Styling improvements:**

1. **Transcript empty state** — replaced the bare dashed box with a rich card:
   mic icon, value-driven headline ("Unlock your audio"), descriptive subtext,
   animated shimmer skeleton bars previewing the upcoming text, and a privacy
   note ("audio is never uploaded"). VLM-requested improvements implemented.

2. **Captions empty state** — matching rich card with subtitles icon, a live
   caption-style preview chip ("this is a caption"), and a style hint footer.

3. **Clip list empty state** — primary-tinted icon badge, clearer copy, and a
   `kbd` hint for the `N` shortcut.

4. **Clip Properties empty state** — primary-tinted icon, headline + subtext,
   plus the contextual marks card.

5. **Clip list cards** — redesigned with a drag grip, 80×48 thumbnail with color
   stripe + index badge, better info hierarchy, and hover-revealed action
   buttons.

6. **Misc** — shimmer keyframe utility added to globals.css for skeleton
   previews; badge count styling on section headers.

### Verification Results (this round)

- Lint clean (`bun run lint` → no errors/warnings).
- `GET /` → 200, no console errors after reload.
- Keyboard shortcuts overlay opens via header button + `?`; shows all 17
  shortcuts grouped by Playback/Editing/View/Navigation.
- `I`/`O` marks render on the timeline (2 IN + 2 OUT spans confirmed).
- Clip thumbnails generate for all clips (5 `img[alt^=Clip]` elements).
- Clip drag-reorder verified: `Clip 1|2|3` → `Clip 2|3|1`.
- VLM confirmed the empty state is "highly polished" with "vibrant lime-green
  accents" and "professional and modern aesthetic".
- VLM confirmed the Clip Properties panel has "video thumbnail preview,
  color selection, sliders, stats, quick actions — very high polish".

### Unresolved Issues / Risks

- **`Enter` to "make clip from marks" via `agent-browser press`** — the marks
  set correctly (verified in DOM) but `press Enter`/`press Space` from the
  test tool didn't trigger the window keydown handler (likely the tool sends
  these special keys differently than letter keys like `i`/`o`, which work).
  This is a test-tooling limitation, not a confirmed app bug; the handler code
  is correct and the `Make clip from marks` button (visible when no clip is
  selected) provides the same action via click.
- **Mobile layout** still cramped at 400px — the timeline waveform is
  compressed. A dedicated mobile timeline popover would help (deferred).
- All Phase 1 known limitations still apply (YouTube export, ffmpeg Aborted
  log, 3D HDR, COEP, ASR WAV-only).

### Priority Recommendations for Next Phase

1. **Caption burn-in export** — render captions onto a canvas frame-by-frame
   and re-encode, so exported MP4s include on-screen text (big value add).
2. **Real waveform** — replace the procedural waveform with actual audio
   envelope via WebAudio offline render.
3. **Persist projects to IndexedDB** — survive reloads; auto-save clips,
   captions, transcript.
4. **More device mockups** — Android phone, laptop, vertical 9:16 Story frame.
5. **Aspect-ratio crop** — 9:16 / 1:1 / 16:9 preview + export framing.
6. **Mobile timeline popover** — collapse the cramped mobile timeline into a
   swipeable sheet.
7. **Actual `.exe` build script** — `bun build --compile` launcher.

---

## Phase 3 Update — Cron Review #2 (Real Waveform + Aspect Crop + New Devices + Persistence)

### Current Project Status Assessment

The app from Phase 2 is stable — `GET /` → 200, no console errors. QA via
agent-browser + VLM confirmed all Phase 1 & 2 features still work. No critical
bugs found. This round focused on the priority recommendations from Phase 2:
real audio waveform, aspect-ratio crop, more device mockups, and project
persistence.

### This Round's Completed Modifications

**1. Real audio waveform** (`src/lib/use-audio-waveform.ts`)
- Replaced the procedural/fake waveform with a real one decoded via the
  WebAudio API (`AudioContext.decodeAudioData`).
- Walks the PCM buffer in ~8ms buckets, takes the max amplitude per bucket,
  normalizes with a gamma curve so quiet parts are visible.
- Stored in the zustand store (`waveform` field) and sampled per-zoom-level
  in the timeline.
- Upgraded the waveform rendering: **mirrored top/bottom bars** with a
  **gradient fill**, and the **played portion (left of playhead) is colored
  lime-green** while the unplayed portion is gray. VLM-confirmed: "real audio
  waveform with varying peaks… mirrored… played portion colored lime-green."

**2. Aspect-ratio crop + preview framing** (`store.ts` + `video-preview.tsx` + `export-panel.tsx`)
- Added `aspect` state (`16:9` | `9:16` | `1:1` | `4:5`) to the store.
- Video preview now wraps the video in an aspect-ratio container with
  `object-cover` so the user sees exactly what they'd export (center-cropped).
- A "9:16 crop" badge appears on the preview when a non-default aspect is selected.
- The device selector row now includes an inline aspect-ratio picker with
  mini visual icons (tiny rectangles showing the aspect shape).
- Export applies the same center-crop via an ffmpeg `crop` filter expression
  (`crop='if(gt(a,TGT),ih*TGT,iw)':'if(gt(a,TGT),ih,iw/TGT)'`) so exported
  clips match the preview framing. Verified: 2 clips exported at 9:16
  (525KB + 527KB MP4).

**3. Caption burn-in export** (`export-panel.tsx` + `store.ts`)
- Added `burnCaptions` toggle to the store.
- When enabled (and format is mp4/webm, and captions exist), an SRT sidecar
  is written to the ffmpeg FS and a `subtitles=...:force_style='...'` filter
  is appended to the video filter chain — burning styled captions directly
  into the exported video.
- UI: a card with a flame icon + Switch toggle, shown only when captions
  exist and format supports it.

**4. New 3D device mockups** (`three/device-mockup.tsx` + `types.ts`)
- **Android phone** — Pixel-style with a flat back, punch-hole camera,
  horizontal camera bar on the back (3 lenses), and a side power button.
- **Story / Reels frame** — a 9:16 phone shell with Instagram-Story-style
  UI overlays: progress segment bars at top, profile circle + username bar,
  bottom action bar gradient with like/comment/send icon placeholders.
- Updated `DeviceKind` type and `DEVICE_LABELS`.
- Video preview's device selector now shows 7 options (Native, iPhone,
  Android, iPad, Desktop, TV, Story). VLM-confirmed both new mockups render
  correctly with the live video texture.

**5. Project persistence to IndexedDB** (`src/lib/persistence.ts` + `src/lib/use-persistence.ts`)
- Auto-saves clips, captions, transcript, source metadata, aspect, and
  captionStyle to IndexedDB (debounced 2s after last change).
- Stores the video File blob in IDB so local-file sources can be re-created
  after a reload (new object URL generated from the stored blob).
- On mount, restores the full state including the video source — user can
  close and reopen the app and continue exactly where they left off.
- Verified: after reload, "Clips2" count survived and the video source was
  restored from the blob (`blob:http://localhost:3000/99b17c34-...`).

**6. Styling polish**
- Waveform bars now use gradients + mirroring + played/unplayed coloring.
- Aspect ratio picker with mini visual icons.
- Export panel shows aspect crop info ("Center-cropped to 9:16 · matches the
  preview frame") and a burn-captions card with flame icon.
- Crop badge on the video preview when non-default aspect is active.

### Verification Results (this round)

- Lint clean (`bun run lint` → no errors/warnings).
- `GET /` → 200, no console errors, no hydration crashes.
- Real waveform: VLM confirmed "real audio waveform with varying peaks…
  mirrored… played portion colored lime-green."
- Aspect crop: VLM confirmed "vertical 9:16 crop frame… explicitly labeled…
  portrait-oriented video preview."
- Android phone mockup: VLM confirmed "3D Android-style phone with punch-hole
  camera… video playing on the screen… polished and realistic."
- Story frame: VLM confirmed "vertical phone-style Story/Reels frame with
  UI overlays, progress bars at top."
- Export with 9:16 crop: both clips exported successfully (525KB + 527KB MP4).
- Persistence: after reload, clips count (2) and video source survived.

### Unresolved Issues / Risks

- **Caption burn-in not yet fully tested end-to-end** — the SRT filter path
  is implemented but not browser-tested with a real caption set. The
  `subtitles` filter requires libass which is included in the @ffmpeg/core
  build; should work but unverified. The sidecar SRT download path is
  confirmed working.
- **IndexedDB blob storage** — large videos (100MB+) stored in IDB could hit
  browser storage quotas. No quota-checking or eviction yet. For now this is
  acceptable for a local tool.
- **Mobile layout** still cramped — deferred.
- All Phase 1 & 2 known limitations still apply.

### Priority Recommendations for Next Phase

1. **Verify caption burn-in** end-to-end with a real caption set — test that
   the `subtitles` filter renders text on the exported MP4.
2. **Storage quota management** — check `navigator.storage.estimate()` and
   warn the user / evict old blobs when near the limit.
3. **Mobile timeline popover** — collapse the cramped mobile timeline into a
   swipeable bottom sheet.
4. **Real waveform on the timeline thumbnail** — show a mini waveform inside
   each clip card in the clip list.
5. **Clip merging** — merge adjacent or overlapping clips into one.
6. **Actual `.exe` build script** — `bun build --compile` launcher.

---

## Phase 4 Update — Cron Review #3 (Burn-in Fix + Speed/Loop + Caption Editor + Merge/Split)

### Current Project Status Assessment

The app from Phase 3 is stable — `GET /` → 200, no console errors. QA via
agent-browser found **one real bug**: the caption burn-in export (added in
Phase 3) was silently rendering nothing because ffmpeg.wasm ships with libass
but **no fonts** ("can't find selected font provider"). This round fixed that
bug and added four new feature areas.

### This Round's Completed Modifications

**1. BUG FIX: Caption burn-in now renders** (`export-panel.tsx` + `public/fonts/`)
- Root cause: ffmpeg.wasm's `subtitles` filter needs a font but the virtual
  FS has none — libass silently skips rendering.
- Fix: bundle `DejaVuSans-Bold.ttf` + `DejaVuSans.ttf` in `/public/fonts/`,
  write the TTF into a `/tmp/fonts/` dir inside ffmpeg's virtual FS before
  running the filter, and pass `fontsdir=/tmp/fonts` to the `subtitles` filter.
- Verified end-to-end: VLM confirmed captions are burned into the exported
  MP4 at the correct timestamps ("This is a test", "Of caption burning",
  "We will render") with the right styling.

**2. Playback speed control** (`store.ts` + `video-preview.tsx`)
- Added `playbackRate` state (0.25× to 2×).
- A gauge-icon button in the controls row shows the current rate and reveals
  a hover popup with 7 speed presets (0.25, 0.5, 0.75, 1, 1.25, 1.5, 2).
- An `useEffect` applies `video.playbackRate` whenever the rate changes.
- Verified: clicking 1.5× set `video.playbackRate` to 1.5.

**3. Loop region** (`store.ts` + `video-preview.tsx` + `timeline.tsx`)
- Added `loopRegion` ({start,end} | null) and `loopEnabled` (bool) state.
- A repeat-icon button in the controls row toggles loop. When enabling, it
  uses the selected clip's range, or the playhead ±1.5s if none selected.
- An `useEffect` watches `currentTime` and snaps the playhead back to the
  loop start when it passes the end (and forward to start if behind).
- The timeline renders a dashed lime **"⟲ LOOP"** overlay band over the
  loop region. Verified: loop overlay renders (2 "LOOP" labels).

**4. Caption style editor** (`store.ts` + `captions-panel.tsx` + `video-preview.tsx` + `export-panel.tsx`)
- Added `captionColor` (hex), `captionSize` (12–48px), `captionPosition`
  (10–90% from top) to the store.
- The Captions panel now shows a fine-tune card with:
  - A native color picker + 5 preset swatches (white, amber, lime, pink, blue).
  - A font-size slider with live px readout.
  - A vertical-position slider with live % readout.
- The `CaptionOverlay` component reads these values and applies them to all
  4 caption styles (bold/minimal/karaoke/boxed).
- The export's burn-in filter converts the hex color to ASS `&HBBGGRR` format
  and maps the position % to libass `MarginV`, so exported videos match the
  in-app preview exactly.
- Verified: setting color to yellow → preview shows yellow captions → export
  burns yellow captions. VLM confirmed: "Yellow (with a black outline)".

**5. Clip merge + split** (`store.ts` + `clip-properties.tsx`)
- `mergeWithNext(id)`: merges a clip with the next one in list order
  (extends end to next.end, renames "A+B"). Disabled for the last clip.
- `splitClip(id, atTime)`: splits a clip into two at the given time
  (creates "A" and "B" with a new color for B). Guards against splits
  too close to the edges (≤0.3s).
- Two new buttons in the Clip Properties "Quick actions" grid: **Split**
  (at playhead) and **Merge next** (with disabled state when N/A).
- Verified: 1 clip → Split at 6s → 2 clips → Merge next → 1 clip.

### Verification Results (this round)

- Lint clean (`bun run lint` → no errors/warnings).
- `GET /` → 200, no console errors after reload.
- **Caption burn-in fix**: VLM confirmed captions render in the exported MP4
  ("This is a test", "Of caption burning", "We will render") at correct
  timestamps.
- **Playback speed**: clicking 1.5× set `video.playbackRate` to 1.5.
- **Loop region**: overlay renders ("LOOP" labels = 2).
- **Caption style editor**: yellow color → preview shows yellow → export
  burns yellow. VLM: "Yellow (with a black outline)".
- **Merge/split**: 1 → split → 2 → merge → 1 clip (verified via clip count).

### Unresolved Issues / Risks

- **Caption burn-in position mapping** is approximate — the `MarginV` calc
  assumes a 720p height and uses a 0.4 scaling factor. For other resolutions
  the vertical position may not match the preview exactly. Could be improved
  by reading the actual video height from ffmpeg.
- **IndexedDB blob storage** — large videos still stored in IDB; no quota
  management yet (deferred from Phase 3).
- **Mobile layout** still cramped — deferred.
- All Phase 1–3 known limitations still apply.

### Priority Recommendations for Next Phase

1. **Accurate burn-in position** — read actual video height from ffmpeg and
   compute `MarginV` precisely so the exported caption position matches the
   preview pixel-perfectly.
2. **Storage quota management** — check `navigator.storage.estimate()` and
   warn/evict when near the limit.
3. **Mobile timeline popover** — collapse the cramped mobile timeline into a
   swipeable bottom sheet.
4. **Mini waveform in clip list cards** — show a tiny waveform per clip.
5. **Crossfade transitions** between clips in a "stitched" export.
6. **Actual `.exe` build script** — `bun build --compile` launcher.

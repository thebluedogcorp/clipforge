"use client";

import { create } from "zustand";
import {
  Clip,
  CaptionSegment,
  DeviceKind,
  ExportFormat,
  ExportJob,
  VideoSource,
  CLIP_COLORS,
} from "./types";
import { uid, clamp } from "./format";

interface ClipperState {
  // source
  source: VideoSource | null;
  setSource: (s: VideoSource | null) => void;

  // playback
  currentTime: number;
  setCurrentTime: (t: number) => void;
  isPlaying: boolean;
  setPlaying: (p: boolean) => void;
  duration: number;
  setDuration: (d: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  muted: boolean;
  toggleMute: () => void;
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  loopRegion: { start: number; end: number } | null;
  setLoopRegion: (r: { start: number; end: number } | null) => void;
  loopEnabled: boolean;
  toggleLoop: () => void;

  // timeline
  zoom: number; // px per second
  setZoom: (z: number) => void;

  // clips
  clips: Clip[];
  selectedClipId: string | null;
  selectClip: (id: string | null) => void;
  addClip: (partial?: Partial<Clip>) => string;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  reorderClips: (from: number, to: number) => void;
  duplicateClip: (id: string) => void;
  mergeWithNext: (id: string) => void;
  splitClip: (id: string, atTime: number) => void;
  autoSplit: (count: number, lengthSec: number, strategy: "even" | "sequential" | "ai") => void;
  clearClips: () => void;
  thumbnails: Record<string, string>; // clipId -> dataURL
  setThumbnail: (id: string, dataUrl: string) => void;

  // in/out marks (keyboard shortcuts)
  inMark: number | null;
  outMark: number | null;
  setInMark: (t: number | null) => void;
  setOutMark: (t: number | null) => void;
  makeClipFromMarks: () => void;

  // transcription & captions
  transcript: string | null;
  setTranscript: (t: string | null) => void;
  captions: CaptionSegment[];
  setCaptions: (c: CaptionSegment[]) => void;
  showCaptions: boolean;
  toggleCaptions: () => void;
  captionStyle: "minimal" | "bold" | "karaoke" | "boxed";
  setCaptionStyle: (s: "minimal" | "bold" | "karaoke" | "boxed") => void;
  captionColor: string;
  setCaptionColor: (c: string) => void;
  captionSize: number;
  setCaptionSize: (n: number) => void;
  captionPosition: number; // 0..100, % from top
  setCaptionPosition: (n: number) => void;
  captionPresetId: string; // ID from CAPTION_PRESETS
  setCaptionPresetId: (id: string) => void;

  // color grade + cinematic effects
  colorGrade: string; // ID from COLOR_GRADES
  setColorGrade: (id: string) => void;
  cinematicEffects: import("@/lib/cinematic-effects").EffectSettings;
  setCinematicEffects: (e: Partial<import("@/lib/cinematic-effects").EffectSettings>) => void;

  // fit mode: crop (fill aspect) or square (1:1 rounded on 9:16 black)
  fitMode: "crop" | "square";
  setFitMode: (m: "crop" | "square") => void;
  squareCorners: "round" | "sharp";
  setSquareCorners: (c: "round" | "sharp") => void;
  barText: string | null; // title text above the square
  setBarText: (t: string | null) => void;

  // video filters (applied to preview + export)
  filters: {
    brightness: number; // 0.5..2, 1 = normal
    contrast: number; // 0..2, 1 = normal
    saturation: number; // 0..3, 1 = normal
    grayscale: number; // 0..1, 0 = color
    blur: number; // 0..10 px
  };
  setFilters: (f: Partial<{ brightness: number; contrast: number; saturation: number; grayscale: number; blur: number }>) => void;
  resetFilters: () => void;

  // watermark/logo overlay
  watermark: {
    src: string | null; // object URL of the image
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
    size: number; // 5..50, % of video width
    opacity: number; // 0..1
  };
  setWatermark: (w: Partial<{ src: string | null; position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"; size: number; opacity: number }>) => void;

  // audio waveform (real, decoded via WebAudio)
  waveform: { peaks: number[]; duration: number } | null;
  setWaveform: (w: { peaks: number[]; duration: number } | null) => void;

  // aspect ratio crop for preview + export
  aspect: "16:9" | "9:16" | "1:1" | "4:5";
  setAspect: (a: "16:9" | "9:16" | "1:1" | "4:5") => void;

  // burn captions into exported video (vs. sidecar SRT)
  burnCaptions: boolean;
  setBurnCaptions: (v: boolean) => void;

  // device preview
  device: DeviceKind;
  setDevice: (d: DeviceKind) => void;
  rotating: boolean;
  toggleRotating: () => void;

  // export
  exportJobs: ExportJob[];
  addExportJob: (j: ExportJob) => void;
  updateExportJob: (id: string, patch: Partial<ExportJob>) => void;
  clearExportJobs: () => void;
  exportFormat: ExportFormat;
  setExportFormat: (f: ExportFormat) => void;
  stitchMode: boolean;
  setStitchMode: (v: boolean) => void;
  crossfadeSec: number;
  setCrossfadeSec: (n: number) => void;
  transitionType: "fade" | "wipeleft" | "wiperight" | "slideup" | "slidedown" | "circleopen" | "circleclose" | "dissolve" | "radial" | "smoothleft" | "smoothright" | "smoothup" | "smoothdown" | "hlwind" | "hrwind" | "vslide" | "hslide";
  setTransitionType: (t: "fade" | "wipeleft" | "wiperight" | "slideup" | "slidedown" | "circleopen" | "circleclose" | "dissolve" | "radial" | "smoothleft" | "smoothright" | "smoothup" | "smoothdown" | "hlwind" | "hrwind" | "vslide" | "hslide") => void;
  // background music
  musicTrack: string | null;
  setMusicTrack: (url: string | null) => void;
  musicVolume: number;
  setMusicVolume: (v: number) => void;
  musicMuted: boolean;
  setMusicMuted: (v: boolean) => void;

  // ui
  activePanel: "clips" | "transcript" | "captions" | "export" | "filters";
  setActivePanel: (p: "clips" | "transcript" | "captions" | "export" | "filters") => void;
  busy: { label: string; progress: number } | null;
  setBusy: (b: { label: string; progress: number } | null) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (v: boolean) => void;
}

export const useClipper = create<ClipperState>((set, get) => ({
  source: null,
  setSource: (s) => set({ source: s, clips: [], transcript: null, captions: [], currentTime: 0 }),

  currentTime: 0,
  setCurrentTime: (t) => set({ currentTime: t }),
  isPlaying: false,
  setPlaying: (p) => set({ isPlaying: p }),
  duration: 0,
  setDuration: (d) => set({ duration: d }),
  volume: 1,
  setVolume: (v) => set({ volume: v }),
  muted: false,
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  playbackRate: 1,
  setPlaybackRate: (r) => set({ playbackRate: r }),
  loopRegion: null,
  setLoopRegion: (r) => set({ loopRegion: r }),
  loopEnabled: false,
  toggleLoop: () => set((s) => ({ loopEnabled: !s.loopEnabled })),

  zoom: 40,
  setZoom: (z) => set({ zoom: clamp(z, 8, 400) }),

  clips: [],
  selectedClipId: null,
  selectClip: (id) => set({ selectedClipId: id }),
  addClip: (partial) => {
    const dur = get().duration || 30;
    const clips = get().clips;
    const color = CLIP_COLORS[clips.length % CLIP_COLORS.length];
    const start = clips.length
      ? Math.min(dur - 5, clips[clips.length - 1].end)
      : 0;
    const clip: Clip = {
      id: uid(),
      name: `Clip ${clips.length + 1}`,
      start,
      end: Math.min(dur, start + 5),
      color,
      enabled: true,
      ...partial,
    };
    set({ clips: [...clips, clip], selectedClipId: clip.id });
    return clip.id;
  },
  updateClip: (id, patch) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  removeClip: (id) =>
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
    })),
  reorderClips: (from, to) =>
    set((s) => {
      const next = [...s.clips];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { clips: next };
    }),
  duplicateClip: (id) =>
    set((s) => {
      const clip = s.clips.find((c) => c.id === id);
      if (!clip) return {};
      const idx = s.clips.indexOf(clip);
      const copy: Clip = {
        ...clip,
        id: uid(),
        name: `${clip.name} copy`,
      };
      const next = [...s.clips];
      next.splice(idx + 1, 0, copy);
      return { clips: next, selectedClipId: copy.id };
    }),
  mergeWithNext: (id) =>
    set((s) => {
      const idx = s.clips.findIndex((c) => c.id === id);
      if (idx === -1) return {};
      const clip = s.clips[idx];
      const next = s.clips[idx + 1];
      if (!next) return {};
      const merged: Clip = {
        ...clip,
        end: next.end,
        name: `${clip.name}+${next.name}`,
      };
      const arr = [...s.clips];
      arr.splice(idx, 2, merged);
      return { clips: arr, selectedClipId: merged.id };
    }),
  splitClip: (id, atTime) =>
    set((s) => {
      const idx = s.clips.findIndex((c) => c.id === id);
      if (idx === -1) return {};
      const clip = s.clips[idx];
      if (atTime <= clip.start + 0.3 || atTime >= clip.end - 0.3) return {};
      const a: Clip = {
        ...clip,
        end: atTime,
        name: `${clip.name} A`,
      };
      const b: Clip = {
        ...clip,
        id: uid(),
        start: atTime,
        name: `${clip.name} B`,
        color: CLIP_COLORS[(idx + 1) % CLIP_COLORS.length],
      };
      const arr = [...s.clips];
      arr.splice(idx, 1, a, b);
      return { clips: arr, selectedClipId: b.id };
    }),
  autoSplit: (count, lengthSec, strategy) => {
    const dur = get().duration;
    if (!dur) return;
    const clips: Clip[] = [];
    if (strategy === "even") {
      const gap = Math.max(0, dur - count * lengthSec);
      const spacing = count > 1 ? gap / (count - 1) : 0;
      for (let i = 0; i < count; i++) {
        const start = i * (lengthSec + spacing);
        clips.push({
          id: uid(),
          name: `Clip ${i + 1}`,
          start: Math.min(dur - 0.5, start),
          end: Math.min(dur, start + lengthSec),
          color: CLIP_COLORS[i % CLIP_COLORS.length],
          enabled: true,
        });
      }
    } else {
      // sequential — back to back, skip if not enough room
      let t = 0;
      for (let i = 0; i < count; i++) {
        if (t + lengthSec > dur) break;
        clips.push({
          id: uid(),
          name: `Clip ${i + 1}`,
          start: t,
          end: t + lengthSec,
          color: CLIP_COLORS[i % CLIP_COLORS.length],
          enabled: true,
        });
        t += lengthSec;
      }
    }
    set({ clips, selectedClipId: clips[0]?.id ?? null });
  },
  clearClips: () => set({ clips: [], selectedClipId: null, thumbnails: {} }),

  thumbnails: {},
  setThumbnail: (id, dataUrl) =>
    set((s) => ({ thumbnails: { ...s.thumbnails, [id]: dataUrl } })),

  inMark: null,
  outMark: null,
  setInMark: (t) => set({ inMark: t }),
  setOutMark: (t) => set({ outMark: t }),
  makeClipFromMarks: () => {
    const s = get();
    if (s.inMark == null || s.outMark == null || s.outMark <= s.inMark) return;
    const id = uid();
    const clip: Clip = {
      id,
      name: `Clip ${s.clips.length + 1}`,
      start: s.inMark,
      end: s.outMark,
      color: CLIP_COLORS[s.clips.length % CLIP_COLORS.length],
      enabled: true,
    };
    set({ clips: [...s.clips, clip], selectedClipId: id, inMark: null, outMark: null });
  },

  transcript: null,
  setTranscript: (t) => set({ transcript: t }),
  captions: [],
  setCaptions: (c) => set({ captions: c }),
  showCaptions: true,
  toggleCaptions: () => set((s) => ({ showCaptions: !s.showCaptions })),
  captionStyle: "bold",
  setCaptionStyle: (s) => set({ captionStyle: s }),
  captionColor: "#ffffff",
  setCaptionColor: (c) => set({ captionColor: c }),
  captionSize: 24,
  setCaptionSize: (n) => set({ captionSize: n }),
  captionPosition: 78,
  setCaptionPosition: (n) => set({ captionPosition: n }),
  captionPresetId: "bold_white",
  setCaptionPresetId: (id) => set({ captionPresetId: id }),

  colorGrade: "none",
  setColorGrade: (id) => set({ colorGrade: id }),
  cinematicEffects: { glow: false, glowStrength: 50, bottomFade: false, bottomFadeStrength: 50, topFade: false, topFadeStrength: 50, vignette: false, vignetteStrength: 40, grain: false, grainStrength: 40 },
  setCinematicEffects: (e) => set((s) => ({ cinematicEffects: { ...s.cinematicEffects, ...e } })),

  fitMode: "crop",
  setFitMode: (m) => set({ fitMode: m }),
  squareCorners: "round",
  setSquareCorners: (c) => set({ squareCorners: c }),
  barText: null,
  setBarText: (t) => set({ barText: t }),

  filters: { brightness: 1, contrast: 1, saturation: 1, grayscale: 0, blur: 0 },
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: { brightness: 1, contrast: 1, saturation: 1, grayscale: 0, blur: 0 } }),

  watermark: { src: null, position: "bottom-right", size: 15, opacity: 0.8 },
  setWatermark: (w) => set((s) => ({ watermark: { ...s.watermark, ...w } })),

  waveform: null,
  setWaveform: (w) => set({ waveform: w }),

  aspect: "16:9",
  setAspect: (a) => set({ aspect: a }),

  burnCaptions: false,
  setBurnCaptions: (v) => set({ burnCaptions: v }),

  device: "native",
  setDevice: (d) => set({ device: d }),
  rotating: true,
  toggleRotating: () => set((s) => ({ rotating: !s.rotating })),

  exportJobs: [],
  addExportJob: (j) => set((s) => ({ exportJobs: [...s.exportJobs, j] })),
  updateExportJob: (id, patch) =>
    set((s) => ({
      exportJobs: s.exportJobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),
  clearExportJobs: () => set({ exportJobs: [] }),
  exportFormat: "mp4",
  setExportFormat: (f) => set({ exportFormat: f }),
  stitchMode: false,
  setStitchMode: (v) => set({ stitchMode: v }),
  crossfadeSec: 0.5,
  setCrossfadeSec: (n) => set({ crossfadeSec: n }),
  transitionType: "fade",
  setTransitionType: (t) => set({ transitionType: t }),
  musicTrack: null,
  setMusicTrack: (url) => set({ musicTrack: url }),
  musicVolume: 0.4,
  setMusicVolume: (v) => set({ musicVolume: v }),
  musicMuted: false,
  setMusicMuted: (v) => set({ musicMuted: v }),

  activePanel: "clips",
  setActivePanel: (p) => set({ activePanel: p }),
  busy: null,
  setBusy: (b) => set({ busy: b }),
  shortcutsOpen: false,
  setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
}));

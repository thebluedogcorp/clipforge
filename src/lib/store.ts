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
  autoSplit: (count: number, lengthSec: number, strategy: "even" | "sequential") => void;
  clearClips: () => void;

  // transcription & captions
  transcript: string | null;
  setTranscript: (t: string | null) => void;
  captions: CaptionSegment[];
  setCaptions: (c: CaptionSegment[]) => void;
  showCaptions: boolean;
  toggleCaptions: () => void;
  captionStyle: "minimal" | "bold" | "karaoke" | "boxed";
  setCaptionStyle: (s: "minimal" | "bold" | "karaoke" | "boxed") => void;

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

  // ui
  activePanel: "clips" | "transcript" | "captions" | "export";
  setActivePanel: (p: "clips" | "transcript" | "captions" | "export") => void;
  busy: { label: string; progress: number } | null;
  setBusy: (b: { label: string; progress: number } | null) => void;
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
  clearClips: () => set({ clips: [], selectedClipId: null }),

  transcript: null,
  setTranscript: (t) => set({ transcript: t }),
  captions: [],
  setCaptions: (c) => set({ captions: c }),
  showCaptions: true,
  toggleCaptions: () => set((s) => ({ showCaptions: !s.showCaptions })),
  captionStyle: "bold",
  setCaptionStyle: (s) => set({ captionStyle: s }),

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

  activePanel: "clips",
  setActivePanel: (p) => set({ activePanel: p }),
  busy: null,
  setBusy: (b) => set({ busy: b }),
}));

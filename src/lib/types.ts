export type DeviceKind =
  | "native"
  | "iphone"
  | "android"
  | "ipad"
  | "desktop"
  | "tv"
  | "story";

export type ExportFormat = "mp4" | "webm" | "gif" | "mp3" | "srt";

export interface Clip {
  id: string;
  name: string;
  start: number;
  end: number;
  color: string; // oklch string
  enabled: boolean;
}

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface VideoSource {
  kind: "file" | "youtube";
  url: string; // object URL for file, embed url for youtube
  name: string;
  duration: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  youtubeId?: string;
}

export interface ExportJob {
  id: string;
  clipId: string;
  clipName: string;
  format: ExportFormat;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  url?: string; // object URL of result
  size?: number;
  error?: string;
}

export const CLIP_COLORS = [
  "oklch(0.82 0.19 132)",
  "oklch(0.78 0.17 65)",
  "oklch(0.7 0.21 18)",
  "oklch(0.8 0.16 320)",
  "oklch(0.85 0.13 90)",
  "oklch(0.74 0.18 175)",
];

export const DEVICE_LABELS: Record<DeviceKind, string> = {
  native: "Native Player",
  iphone: "iPhone 15 Pro",
  android: "Android Pixel",
  ipad: "iPad Pro",
  desktop: "Desktop Browser",
  tv: "Smart TV",
  story: "Story / Reels",
};

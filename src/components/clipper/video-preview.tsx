"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  SkipBack,
  SkipForward,
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Square,
  Subtitles,
  RotateCw,
  Crop,
  Repeat,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useClipper } from "@/lib/store";
import { videoController } from "@/lib/video-controller";
import { formatTime } from "@/lib/format";
import type { DeviceKind } from "@/lib/types";

// three.js / r3f are browser-only — load on demand
const DeviceMockup = dynamic(
  () => import("@/components/three/device-mockup").then((m) => m.DeviceMockup),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Loading 3D mockup…
      </div>
    ),
  }
);

const DEVICES: { kind: DeviceKind; icon: typeof Monitor; label: string }[] = [
  { kind: "native", icon: Square, label: "Native" },
  { kind: "iphone", icon: Smartphone, label: "iPhone" },
  { kind: "android", icon: Smartphone, label: "Android" },
  { kind: "ipad", icon: Tablet, label: "iPad" },
  { kind: "desktop", icon: Monitor, label: "Desktop" },
  { kind: "tv", icon: Tv, label: "TV" },
  { kind: "story", icon: Square, label: "Story" },
];

const ASPECTS: { value: "16:9" | "9:16" | "1:1" | "4:5"; label: string; ratio: number }[] = [
  { value: "16:9", label: "16:9", ratio: 16 / 9 },
  { value: "9:16", label: "9:16", ratio: 9 / 16 },
  { value: "1:1", label: "1:1", ratio: 1 },
  { value: "4:5", label: "4:5", ratio: 4 / 5 },
];

export function VideoPreview() {
  const source = useClipper((s) => s.source);
  const device = useClipper((s) => s.device);
  const setDevice = useClipper((s) => s.setDevice);
  const showCaptions = useClipper((s) => s.showCaptions);
  const toggleCaptions = useClipper((s) => s.toggleCaptions);
  const captions = useClipper((s) => s.captions);
  const captionStyle = useClipper((s) => s.captionStyle);
  const rotating = useClipper((s) => s.rotating);
  const toggleRotating = useClipper((s) => s.toggleRotating);
  const aspect = useClipper((s) => s.aspect);
  const setAspect = useClipper((s) => s.setAspect);
  const playbackRate = useClipper((s) => s.playbackRate);
  const setPlaybackRate = useClipper((s) => s.setPlaybackRate);
  const loopRegion = useClipper((s) => s.loopRegion);
  const setLoopRegion = useClipper((s) => s.setLoopRegion);
  const loopEnabled = useClipper((s) => s.loopEnabled);
  const toggleLoop = useClipper((s) => s.toggleLoop);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // local UI state driven by the video element
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  // bind controller
  useEffect(() => {
    videoController.bind(videoRef.current);
    return () => videoController.bind(null);
  }, []);

  // attach video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      setCurrentTime(v.currentTime);
    };
    const onDur = () => setDuration(v.duration || 0);
    const onVol = () => {
      setVolume(v.volume);
      setMuted(v.muted);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("volumechange", onVol);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("volumechange", onVol);
    };
  }, [source]);

  // apply playback rate to the video element
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = playbackRate;
  }, [playbackRate]);

  // loop region: when enabled and playhead passes the end, jump back to start
  useEffect(() => {
    if (!loopEnabled || !loopRegion) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime >= loopRegion.end) {
      v.currentTime = loopRegion.start;
    }
    if (v.currentTime < loopRegion.start) {
      v.currentTime = loopRegion.start;
    }
  }, [currentTime, loopEnabled, loopRegion]);

  // sync store with video state
  const setCurrentTimeStore = useClipper((s) => s.setCurrentTime);
  const setPlayingStore = useClipper((s) => s.setPlaying);
  const setDurationStore = useClipper((s) => s.setDuration);
  useEffect(() => {
    setCurrentTimeStore(currentTime);
  }, [currentTime, setCurrentTimeStore]);
  useEffect(() => {
    setPlayingStore(isPlaying);
  }, [isPlaying, setPlayingStore]);
  useEffect(() => {
    setDurationStore(duration);
    // also update source duration
    const src = useClipper.getState().source;
    if (src && src.duration !== duration && duration > 0) {
      useClipper.getState().setSource({ ...src, duration });
    }
  }, [duration, setDurationStore]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.code === "Space") {
        e.preventDefault();
        videoController.toggle();
      } else if (e.code === "ArrowLeft") {
        videoController.seek(videoController.currentTime - 5);
      } else if (e.code === "ArrowRight") {
        videoController.seek(videoController.currentTime + 5);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const togglePlay = useCallback(() => videoController.toggle(), []);
  const seek = useCallback((t: number) => videoController.seek(t), []);

  const activeCaption = captions.find(
    (c) => currentTime >= c.start && currentTime < c.end
  );

  if (!source) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-border/60 bg-card/40">
          <Monitor className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="relative space-y-1">
          <p className="text-sm font-medium text-muted-foreground">No source loaded</p>
          <p className="text-xs text-muted-foreground/70">
            Upload a video or paste a YouTube link to start clipping
          </p>
        </div>
      </div>
    );
  }

  const isYouTube = source.kind === "youtube";

  return (
    <div className="flex h-full flex-col">
      {/* Stage */}
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden p-4"
      >
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />

        {/* hidden video always mounted for local files (drives 3D texture too) */}
        {isYouTube ? (
          <div
            className={`relative z-10 ${device === "native" ? "h-full max-h-[70vh] w-full" : ""}`}
            style={{ display: device === "native" ? "block" : "none" }}
          >
            <div className="relative aspect-video h-full w-full overflow-hidden rounded-xl border border-border/60 bg-black shadow-2xl">
              <iframe
                src={source.url}
                title={source.name}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <>
            {/* single video element — visible in native mode (aspect-cropped),
                hidden in device mode (feeds the 3D VideoTexture) */}
            <div
              className={`relative z-10 ${device === "native" ? "flex h-full w-full items-center justify-center" : "pointer-events-none absolute h-px w-px opacity-0"}`}
            >
              <div
                className="relative overflow-hidden rounded-xl border border-border/60 bg-black shadow-2xl"
                style={{
                  aspectRatio:
                    aspect === "16:9" ? "16 / 9"
                    : aspect === "9:16" ? "9 / 16"
                    : aspect === "1:1" ? "1 / 1"
                    : "4 / 5",
                  maxHeight: "100%",
                  maxWidth: "100%",
                  height: aspect === "9:16" || aspect === "4:5" ? "100%" : "auto",
                  width: aspect === "9:16" || aspect === "4:5" ? "auto" : "100%",
                }}
              >
                <video
                  ref={videoRef}
                  src={source.url}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: "center" }}
                  playsInline
                  crossOrigin="anonymous"
                />
                {/* caption overlay (native mode only — 3D handles its own) */}
                {device === "native" && showCaptions && activeCaption && (
                  <CaptionOverlay text={activeCaption.text} style={captionStyle} />
                )}
                {/* aspect badge */}
                {device === "native" && aspect !== "16:9" && (
                  <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary backdrop-blur">
                    {aspect} crop
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 3D device mockup */}
        {!isYouTube && device !== "native" && (
          <div className="relative z-10 h-full w-full">
            <DeviceMockup videoRef={videoRef} />
          </div>
        )}
      </div>

      {/* Device selector + aspect ratio */}
      <div className="flex flex-wrap items-center justify-center gap-1 border-t border-border/40 px-3 py-2">
        <TooltipProvider delayDuration={200}>
          {/* aspect ratio group — only relevant for native */}
          {device === "native" && !isYouTube && (
            <>
              <div className="mr-1 flex items-center gap-0.5 rounded-lg border border-border/40 bg-card/40 p-0.5">
                {ASPECTS.map((a) => {
                  const active = aspect === a.value;
                  return (
                    <Tooltip key={a.value}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setAspect(a.value)}
                          className={`flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-mono font-medium transition-colors ${
                            active
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span
                            className="block border border-current"
                            style={{
                              width: a.ratio >= 1 ? "10px" : `${10 * a.ratio}px`,
                              height: a.ratio >= 1 ? `${10 / a.ratio}px` : "10px",
                            }}
                          />
                          {a.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Crop to {a.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <Separator orientation="vertical" className="mx-1 h-5" />
            </>
          )}
          {DEVICES.map((d) => {
            const Icon = d.icon;
            const active = device === d.kind;
            return (
              <Tooltip key={d.kind}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDevice(d.kind)}
                    className={`gap-1.5 rounded-lg px-2.5 text-xs ${
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">{d.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {d.label} mockup
                </TooltipContent>
              </Tooltip>
            );
          })}
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCaptions}
                className={`gap-1.5 rounded-lg px-2.5 text-xs ${
                  showCaptions
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Subtitles className="h-3.5 w-3.5" />
                <span className="hidden md:inline">CC</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Toggle captions
            </TooltipContent>
          </Tooltip>
          {device !== "native" && !isYouTube && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleRotating}
                  className={`gap-1.5 rounded-lg px-2.5 text-xs ${
                    rotating
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <RotateCw className={`h-3.5 w-3.5 ${rotating ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Auto-rotate
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>

      {/* Custom controls (local files only) */}
      {!isYouTube && (
        <div className="border-t border-border/40 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => seek(currentTime - 5)}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => seek(currentTime + 5)}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <span className="w-12 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
              {formatTime(currentTime)}
            </span>

            <Slider
              value={[currentTime]}
              max={duration || 1}
              step={0.01}
              onValueChange={([v]) => seek(v)}
              className="flex-1"
            />

            <span className="w-12 shrink-0 font-mono text-[11px] text-muted-foreground">
              {formatTime(duration)}
            </span>

            <Separator orientation="vertical" className="h-5" />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                const newMuted = !muted;
                videoController.element!.muted = newMuted;
                if (!newMuted && volume === 0) {
                  videoController.setVolume(1);
                }
              }}
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[muted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={([v]) => videoController.setVolume(v / 100)}
              className="w-20"
            />

            <Separator orientation="vertical" className="h-5" />

            {/* Playback speed */}
            <div className="group relative flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                title="Playback speed"
              >
                <Gauge className="h-3.5 w-3.5" />
                {playbackRate.toFixed(2).replace(/\.?0+$/, "")}×
              </Button>
              <div className="absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 group-hover:block">
                <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-popover p-1 shadow-xl">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <button
                      key={r}
                      onClick={() => setPlaybackRate(r)}
                      className={`rounded px-1.5 py-1 font-mono text-[10px] transition-colors ${
                        playbackRate === r
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {r}×
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Loop region toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 shrink-0 ${
                loopEnabled
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                if (!loopEnabled) {
                  // enable: use the selected clip's range, or current playhead ±3s
                  const sel = useClipper.getState().clips.find((c) => c.id === useClipper.getState().selectedClipId);
                  if (sel) {
                    setLoopRegion({ start: sel.start, end: sel.end });
                  } else {
                    const t = videoController.currentTime;
                    setLoopRegion({ start: Math.max(0, t - 1.5), end: t + 1.5 });
                  }
                }
                toggleLoop();
              }}
              title="Loop region (toggle)"
            >
              <Repeat className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => containerRef.current?.requestFullscreen?.()}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CaptionOverlay({
  text,
  style,
}: {
  text: string;
  style: "minimal" | "bold" | "karaoke" | "boxed";
}) {
  const color = useClipper((s) => s.captionColor);
  const size = useClipper((s) => s.captionSize);
  const position = useClipper((s) => s.captionPosition);
  const base =
    "pointer-events-none absolute left-1/2 z-20 max-w-[80%] -translate-x-1/2 text-center";
  const posStyle = { top: `${position}%`, color, fontSize: `${size}px` };
  if (style === "minimal") {
    return (
      <div className={`${base} drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]`} style={posStyle}>
        {text}
      </div>
    );
  }
  if (style === "boxed") {
    return (
      <div className={`${base} rounded-md bg-black/80 px-3 py-1.5 font-medium`} style={posStyle}>
        {text}
      </div>
    );
  }
  if (style === "karaoke") {
    const words = text.split(" ");
    return (
      <div className={`${base} flex flex-wrap justify-center gap-x-1.5 gap-y-1`} style={posStyle}>
        {words.map((w, i) => (
          <span
            key={i}
            className="rounded bg-black/70 px-1 font-extrabold uppercase tracking-tight"
            style={{
              color: i < words.length / 2 ? "oklch(0.82 0.19 132)" : color,
            }}
          >
            {w}
          </span>
        ))}
      </div>
    );
  }
  // bold
  return (
    <div
      className={`${base} font-extrabold uppercase tracking-tight drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]`}
      style={{ ...posStyle, WebkitTextStroke: "1px rgba(0,0,0,0.6)" }}
    >
      {text}
    </div>
  );
}

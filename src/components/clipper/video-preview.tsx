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
  { kind: "ipad", icon: Tablet, label: "iPad" },
  { kind: "desktop", icon: Monitor, label: "Desktop" },
  { kind: "tv", icon: Tv, label: "TV" },
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
          <video
            ref={videoRef}
            src={source.url}
            className={`z-10 max-h-full max-w-full rounded-xl border border-border/60 bg-black shadow-2xl ${
              device === "native" ? "" : "pointer-events-none absolute h-px w-px opacity-0"
            }`}
            playsInline
            crossOrigin="anonymous"
          />
        )}

        {/* 3D device mockup */}
        {!isYouTube && device !== "native" && (
          <div className="relative z-10 h-full w-full">
            <DeviceMockup videoRef={videoRef} />
          </div>
        )}

        {/* Caption overlay (native mode only — 3D handles its own) */}
        {device === "native" && showCaptions && activeCaption && (
          <CaptionOverlay text={activeCaption.text} style={captionStyle} />
        )}
      </div>

      {/* Device selector */}
      <div className="flex items-center justify-center gap-1 border-t border-border/40 px-3 py-2">
        <TooltipProvider delayDuration={200}>
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
  const base =
    "pointer-events-none absolute bottom-16 left-1/2 z-20 max-w-[80%] -translate-x-1/2 text-center";
  if (style === "minimal") {
    return (
      <div className={`${base} text-base text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]`}>
        {text}
      </div>
    );
  }
  if (style === "boxed") {
    return (
      <div className={`${base} rounded-md bg-black/80 px-3 py-1.5 text-base font-medium text-white`}>
        {text}
      </div>
    );
  }
  if (style === "karaoke") {
    const words = text.split(" ");
    return (
      <div className={`${base} flex flex-wrap justify-center gap-x-1.5 gap-y-1`}>
        {words.map((w, i) => (
          <span
            key={i}
            className="rounded bg-black/70 px-1 text-base font-extrabold uppercase tracking-tight text-white"
            style={{
              color: i < words.length / 2 ? "oklch(0.82 0.19 132)" : "white",
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
      className={`${base} text-2xl font-extrabold uppercase tracking-tight text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]`}
      style={{ WebkitTextStroke: "1px rgba(0,0,0,0.6)" }}
    >
      {text}
    </div>
  );
}

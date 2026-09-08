"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Scissors,
  Plus,
  Trash2,
  Wand2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClipper } from "@/lib/store";
import { videoController } from "@/lib/video-controller";
import { formatTime, formatShort, clamp, uid } from "@/lib/format";
import { CLIP_COLORS } from "@/lib/types";

type DragMode =
  | { kind: "none" }
  | { kind: "create"; startTime: number }
  | { kind: "move"; id: string; offset: number }
  | { kind: "resize-left"; id: string }
  | { kind: "resize-right"; id: string };

export function Timeline() {
  const duration = useClipper((s) => s.duration);
  const zoom = useClipper((s) => s.zoom);
  const setZoom = useClipper((s) => s.setZoom);
  const clips = useClipper((s) => s.clips);
  const currentTime = useClipper((s) => s.currentTime);
  const selectedClipId = useClipper((s) => s.selectedClipId);
  const selectClip = useClipper((s) => s.selectClip);
  const updateClip = useClipper((s) => s.updateClip);
  const addClip = useClipper((s) => s.addClip);
  const autoSplit = useClipper((s) => s.autoSplit);
  const clearClips = useClipper((s) => s.clearClips);

  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode>({ kind: "none" });
  const [creating, setCreating] = useState<{ start: number; end: number } | null>(null);

  // auto-split params
  const [count, setCount] = useState(3);
  const [length, setLength] = useState(10);
  const [strategy, setStrategy] = useState<"even" | "sequential">("even");

  const pxPerSec = zoom;
  const totalWidth = Math.max(duration * pxPerSec, 600);

  // ---- coordinate helpers ----
  const timeFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      return clamp(x / pxPerSec, 0, duration || 0);
    },
    [pxPerSec, duration]
  );

  // ---- pointer handlers ----
  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const t = timeFromClientX(e.clientX);
      // seek on click
      videoController.seek(t);
      // start creating a region
      setDrag({ kind: "create", startTime: t });
      setCreating({ start: t, end: t });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [timeFromClientX]
  );

  const onClipPointerDown = useCallback(
    (e: React.PointerEvent, id: string, mode: "move" | "resize-left" | "resize-right") => {
      e.stopPropagation();
      if (e.button !== 0) return;
      selectClip(id);
      const clip = clips.find((c) => c.id === id);
      if (!clip) return;
      const t = timeFromClientX(e.clientX);
      if (mode === "move") {
        setDrag({ kind: "move", id, offset: t - clip.start });
      } else if (mode === "resize-left") {
        setDrag({ kind: "resize-left", id });
      } else {
        setDrag({ kind: "resize-right", id });
      }
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [clips, selectClip, timeFromClientX]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (drag.kind === "none") return;
      const t = timeFromClientX(e.clientX);

      if (drag.kind === "create") {
        const s = Math.min(drag.startTime, t);
        const en = Math.max(drag.startTime, t);
        setCreating({ start: s, end: en });
        // live scrub during create
        videoController.seek(t);
      } else if (drag.kind === "move") {
        const clip = clips.find((c) => c.id === drag.id);
        if (!clip) return;
        const len = clip.end - clip.start;
        let ns = clamp(t - drag.offset, 0, duration - len);
        updateClip(drag.id, { start: ns, end: ns + len });
      } else if (drag.kind === "resize-left") {
        const clip = clips.find((c) => c.id === drag.id);
        if (!clip) return;
        const ns = clamp(t, 0, clip.end - 0.5);
        updateClip(drag.id, { start: ns });
      } else if (drag.kind === "resize-right") {
        const clip = clips.find((c) => c.id === drag.id);
        if (!clip) return;
        const ne = clamp(t, clip.start + 0.5, duration);
        updateClip(drag.id, { end: ne });
      }
    },
    [drag, clips, duration, timeFromClientX, updateClip]
  );

  const onPointerUp = useCallback(() => {
    if (drag.kind === "create" && creating) {
      const len = creating.end - creating.start;
      if (len >= 0.5) {
        const id = uid();
        useClipper.setState((s) => ({
          clips: [
            ...s.clips,
            {
              id,
              name: `Clip ${s.clips.length + 1}`,
              start: creating.start,
              end: creating.end,
              color: CLIP_COLORS[s.clips.length % CLIP_COLORS.length],
              enabled: true,
            },
          ],
          selectedClipId: id,
        }));
      }
      setCreating(null);
    }
    setDrag({ kind: "none" });
  }, [drag, creating]);

  // keep playhead visible while playing
  useEffect(() => {
    if (!scrollRef.current || !trackRef.current) return;
    const el = scrollRef.current;
    const playheadX = currentTime * pxPerSec;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth;
    if (playheadX < viewLeft + 60 || playheadX > viewRight - 60) {
      el.scrollTo({
        left: clamp(playheadX - el.clientWidth / 2, 0, totalWidth),
        behavior: "smooth",
      });
    }
  }, [currentTime, pxPerSec, totalWidth]);

  // ruler ticks
  const ticks = useMemo(() => {
    if (!duration) return [];
    // pick a nice interval based on zoom
    const targetPx = 80;
    const rawSec = targetPx / pxPerSec;
    const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    const step = steps.find((s) => s >= rawSec) ?? 600;
    const arr: { t: number; major: boolean }[] = [];
    for (let t = 0; t <= duration; t += step / 5) {
      arr.push({ t, major: Math.abs((t % step) / step) < 0.01 || Math.abs(t % step - step) < 0.01 });
    }
    return arr;
  }, [duration, pxPerSec]);

  // decorative waveform
  const waveform = useMemo(() => {
    if (!duration) return [];
    const count = Math.ceil(totalWidth / 4);
    const bars: number[] = [];
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      const t = (i / count) * duration;
      // envelope: a few "speech bursts"
      const env =
        0.35 +
        0.5 * Math.abs(Math.sin(t * 0.7) * Math.sin(t * 0.13 + 1)) +
        0.15 * rand();
      bars.push(clamp(env, 0.08, 1));
    }
    return bars;
  }, [duration, totalWidth]);

  const playheadX = currentTime * pxPerSec;

  return (
    <div className="flex h-full flex-col bg-card/30">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Auto-split
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="cnt" className="text-[11px] text-muted-foreground">
            Clips
          </Label>
          <Input
            id="cnt"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(clamp(Number(e.target.value) || 1, 1, 50))}
            className="h-8 w-16 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="len" className="text-[11px] text-muted-foreground">
            Length
          </Label>
          <Input
            id="len"
            type="number"
            min={1}
            max={600}
            value={length}
            onChange={(e) => setLength(clamp(Number(e.target.value) || 1, 1, 600))}
            className="h-8 w-16 text-xs"
          />
          <span className="text-[11px] text-muted-foreground">s</span>
        </div>
        <Select value={strategy} onValueChange={(v) => setStrategy(v as "even" | "sequential")}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="even">Even spread</SelectItem>
            <SelectItem value="sequential">Back-to-back</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => autoSplit(count, length, strategy)}
          disabled={!duration}
        >
          <Scissors className="h-3.5 w-3.5" />
          Generate
        </Button>

        <div className="mx-1 h-5 w-px bg-border/60" />

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={() => addClip()}
          disabled={!duration}
        >
          <Plus className="h-3.5 w-3.5" />
          Add clip
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          onClick={clearClips}
          disabled={clips.length === 0}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setZoom(Math.max(8, zoom / 1.5))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <input
            type="range"
            className="slick-range w-28"
            min={8}
            max={400}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setZoom(Math.min(400, zoom * 1.5))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() =>
              duration &&
              setZoom(
                clamp((scrollRef.current?.clientWidth ?? 800) / duration, 8, 400)
              )
            }
            title="Fit to width"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline body */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-x-auto overflow-y-hidden"
      >
        <div style={{ width: totalWidth, minWidth: "100%" }} className="relative h-full">
          {/* Ruler */}
          <div className="relative h-6 border-b border-border/50 bg-background/40 select-none">
            {ticks.map((tk, i) => (
              <div
                key={i}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: tk.t * pxPerSec }}
              >
                <div
                  className={`w-px ${tk.major ? "h-3 bg-border" : "h-1.5 bg-border/50"}`}
                />
                {tk.major && (
                  <span className="mt-0.5 -translate-x-1/2 font-mono text-[9px] text-muted-foreground">
                    {formatShort(tk.t)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Waveform track */}
          <div
            ref={trackRef}
            className="relative h-[88px] cursor-text"
            onPointerDown={onTrackPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* waveform bars */}
            <div className="pointer-events-none absolute inset-0 flex items-center gap-px overflow-hidden px-px">
              {waveform.map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] shrink-0 rounded-full bg-foreground/15"
                  style={{ height: `${h * 70}%` }}
                />
              ))}
            </div>

            {/* center line */}
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border/40" />

            {/* clip regions */}
            {clips.map((clip) => {
              const left = clip.start * pxPerSec;
              const width = (clip.end - clip.start) * pxPerSec;
              const selected = clip.id === selectedClipId;
              return (
                <div
                  key={clip.id}
                  onPointerDown={(e) => onClipPointerDown(e, clip.id, "move")}
                  className={`group absolute top-2 bottom-2 select-none overflow-hidden rounded-lg border ${
                    selected ? "z-20 border-white/60" : "z-10 border-white/15"
                  }`}
                  style={{
                    left,
                    width,
                    background: `linear-gradient(180deg, ${clip.color}, ${clip.color})`,
                    boxShadow: selected
                      ? `0 0 0 1px oklch(1 0 0 / 0.4), 0 8px 24px -6px ${clip.color}`
                      : `0 4px 14px -8px ${clip.color}`,
                    opacity: clip.enabled ? 1 : 0.4,
                  }}
                >
                  {/* gloss */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
                  {/* label */}
                  <div className="pointer-events-none absolute left-2 top-1.5 flex items-center gap-1.5">
                    <GripVertical className="h-3 w-3 text-black/50" />
                    <span className="truncate text-[11px] font-semibold text-black/85">
                      {clip.name}
                    </span>
                  </div>
                  <div className="pointer-events-none absolute bottom-1.5 left-2 right-2 flex items-center justify-between font-mono text-[9px] text-black/70">
                    <span>{formatTime(clip.end - clip.start, true)}</span>
                    <span>{formatTime(clip.start)}</span>
                  </div>

                  {/* resize handles */}
                  <div
                    onPointerDown={(e) => onClipPointerDown(e, clip.id, "resize-left")}
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-black/40"
                  />
                  <div
                    onPointerDown={(e) => onClipPointerDown(e, clip.id, "resize-right")}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/20 hover:bg-black/40"
                  />
                </div>
              );
            })}

            {/* creating region */}
            {creating && (
              <div
                className="pointer-events-none absolute top-2 bottom-2 rounded-lg border-2 border-dashed border-primary bg-primary/20"
                style={{
                  left: creating.start * pxPerSec,
                  width: (creating.end - creating.start) * pxPerSec,
                }}
              >
                <span className="absolute -top-5 left-0 rounded bg-primary px-1.5 py-0.5 font-mono text-[9px] text-primary-foreground">
                  {formatTime(creating.end - creating.start, true)}
                </span>
              </div>
            )}

            {/* playhead */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-primary"
              style={{ left: playheadX }}
            >
              <div className="absolute -top-0 -left-1.5 h-3 w-3 rounded-full bg-primary glow-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

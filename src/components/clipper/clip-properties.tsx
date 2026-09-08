"use client";

import { Film, Palette, Clock, ArrowRight, Copy, Scissors, Trash2, Split, GitMerge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useClipper } from "@/lib/store";
import { videoController } from "@/lib/video-controller";
import { CLIP_COLORS } from "@/lib/types";
import { formatTime } from "@/lib/format";

export function ClipProperties() {
  const clips = useClipper((s) => s.clips);
  const selectedId = useClipper((s) => s.selectedClipId);
  const updateClip = useClipper((s) => s.updateClip);
  const duplicateClip = useClipper((s) => s.duplicateClip);
  const removeClip = useClipper((s) => s.removeClip);
  const mergeWithNext = useClipper((s) => s.mergeWithNext);
  const splitClip = useClipper((s) => s.splitClip);
  const duration = useClipper((s) => s.duration);
  const thumbnails = useClipper((s) => s.thumbnails);
  const inMark = useClipper((s) => s.inMark);
  const outMark = useClipper((s) => s.outMark);
  const setInMark = useClipper((s) => s.setInMark);
  const setOutMark = useClipper((s) => s.setOutMark);
  const makeClipFromMarks = useClipper((s) => s.makeClipFromMarks);

  const clip = clips.find((c) => c.id === selectedId) || null;

  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/8 text-primary/70">
          <Film className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/80">No clip selected</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Pick a clip from the list, or drag on the timeline to make one.
          </p>
        </div>
        {(inMark != null || outMark != null) && (
          <div className="w-full space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Marks set
            </p>
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span>In: {inMark != null ? formatTime(inMark, true) : "—"}</span>
              <span>Out: {outMark != null ? formatTime(outMark, true) : "—"}</span>
            </div>
            <Button
              size="sm"
              className="h-7 w-full gap-1.5 text-xs"
              disabled={inMark == null || outMark == null}
              onClick={makeClipFromMarks}
            >
              <Scissors className="h-3.5 w-3.5" />
              Make clip from marks
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Thumbnail preview */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-black/50">
        {thumbnails[clip.id] ? (
          <img
            src={thumbnails[clip.id]}
            alt={clip.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
          <span className="font-mono text-[10px] text-white/80">
            {formatTime(clip.start)} → {formatTime(clip.end)}
          </span>
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-black"
            style={{ background: clip.color }}
          >
            {formatTime(clip.end - clip.start, true)}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="clip-name" className="text-xs text-muted-foreground">
          Name
        </Label>
        <Input
          id="clip-name"
          value={clip.name}
          onChange={(e) => updateClip(clip.id, { name: e.target.value })}
          className="h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Color</Label>
        <div className="flex flex-wrap gap-2">
          {CLIP_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateClip(clip.id, { color: c })}
              className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110 ${
                clip.color === c ? "ring-white/70" : "ring-transparent"
              }`}
              style={{ background: c }}
              aria-label="clip color"
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Start
          </Label>
          <span className="font-mono text-xs">{formatTime(clip.start, true)}</span>
        </div>
        <Slider
          value={[clip.start]}
          min={0}
          max={Math.max(0.1, duration - 0.5)}
          step={0.1}
          onValueChange={([v]) =>
            updateClip(clip.id, {
              start: Math.min(v, clip.end - 0.5),
            })
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowRight className="h-3.5 w-3.5" />
            End
          </Label>
          <span className="font-mono text-xs">{formatTime(clip.end, true)}</span>
        </div>
        <Slider
          value={[clip.end]}
          min={0.5}
          max={duration}
          step={0.1}
          onValueChange={([v]) =>
            updateClip(clip.id, {
              end: Math.max(v, clip.start + 0.5),
            })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Duration" value={formatTime(clip.end - clip.start, true)} />
        <Stat
          label="Midpoint"
          value={formatTime((clip.start + clip.end) / 2, true)}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => videoController.seek(clip.start)}
        >
          Jump to start
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => videoController.seek(clip.end)}
        >
          Jump to end
        </Button>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Quick actions</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              setInMark(clip.start);
              setOutMark(clip.end);
            }}
          >
            <Scissors className="h-3.5 w-3.5" />
            Copy to marks
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => duplicateClip(clip.id)}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              // split at the playhead (current time from store)
              const t = useClipper.getState().currentTime;
              splitClip(clip.id, t);
            }}
            disabled={!duration}
            title="Split at playhead"
          >
            <Split className="h-3.5 w-3.5" />
            Split
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => mergeWithNext(clip.id)}
            disabled={clips.findIndex((c) => c.id === clip.id) >= clips.length - 1}
            title="Merge with next clip"
          >
            <GitMerge className="h-3.5 w-3.5" />
            Merge next
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => removeClip(clip.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete clip
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/40 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Palette className="h-3.5 w-3.5" />
          Pro tip
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
          Drag the clip body on the timeline to move it; drag its edges to trim.
          Hold and drag on empty space to create a new region.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-medium">{value}</p>
    </div>
  );
}

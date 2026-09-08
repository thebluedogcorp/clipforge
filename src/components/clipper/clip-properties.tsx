"use client";

import { Film, Palette, Clock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useClipper } from "@/lib/store";
import { videoController } from "@/lib/video-controller";
import { CLIP_COLORS } from "@/lib/types";
import { formatTime } from "@/lib/format";

export function ClipProperties() {
  const clips = useClipper((s) => s.clips);
  const selectedId = useClipper((s) => s.selectedClipId);
  const updateClip = useClipper((s) => s.updateClip);
  const duration = useClipper((s) => s.duration);

  const clip = clips.find((c) => c.id === selectedId) || null;

  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-card/40">
          <Film className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Select a clip to edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

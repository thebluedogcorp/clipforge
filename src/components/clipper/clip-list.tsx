"use client";

import { Plus, Trash2, Eye, EyeOff, Film, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClipper } from "@/lib/store";
import { videoController } from "@/lib/video-controller";
import { formatTime } from "@/lib/format";

export function ClipList() {
  const clips = useClipper((s) => s.clips);
  const selectedClipId = useClipper((s) => s.selectedClipId);
  const selectClip = useClipper((s) => s.selectClip);
  const addClip = useClipper((s) => s.addClip);
  const removeClip = useClipper((s) => s.removeClip);
  const updateClip = useClipper((s) => s.updateClip);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Clips
          <span className="ml-1.5 text-foreground/60">{clips.length}</span>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => addClip()}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {clips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-5 text-center">
          <Film className="mx-auto h-6 w-6 text-muted-foreground/60" />
          <p className="mt-2 text-xs text-muted-foreground">
            No clips yet. Drag on the timeline or use Auto-split.
          </p>
        </div>
      ) : (
        <div className="max-h-[40vh] space-y-1.5 overflow-y-auto pr-0.5">
          {clips.map((clip, i) => {
            const selected = clip.id === selectedClipId;
            const dur = clip.end - clip.start;
            return (
              <div
                key={clip.id}
                onClick={() => {
                  selectClip(clip.id);
                  videoController.seek(clip.start);
                }}
                className={`group flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 transition-colors ${
                  selected
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 bg-card/40 hover:border-border hover:bg-card/70"
                }`}
              >
                {/* color + index */}
                <div
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px] font-bold text-black/80"
                  style={{ background: clip.color }}
                >
                  {i + 1}
                </div>

                {/* info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{clip.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5 font-mono">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(dur, true)}
                    </span>
                    <span className="font-mono">
                      {formatTime(clip.start)}–{formatTime(clip.end)}
                    </span>
                  </div>
                </div>

                {/* actions */}
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateClip(clip.id, { enabled: !clip.enabled });
                    }}
                  >
                    {clip.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeClip(clip.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

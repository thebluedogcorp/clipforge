"use client";

import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Film,
  Clock,
  Copy,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClipper } from "@/lib/store";
import { videoController } from "@/lib/video-controller";
import { formatTime } from "@/lib/format";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function ClipList() {
  const clips = useClipper((s) => s.clips);
  const selectedClipId = useClipper((s) => s.selectedClipId);
  const selectClip = useClipper((s) => s.selectClip);
  const addClip = useClipper((s) => s.addClip);
  const removeClip = useClipper((s) => s.removeClip);
  const updateClip = useClipper((s) => s.updateClip);
  const reorderClips = useClipper((s) => s.reorderClips);
  const duplicateClip = useClipper((s) => s.duplicateClip);
  const thumbnails = useClipper((s) => s.thumbnails);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = clips.findIndex((c) => c.id === active.id);
    const to = clips.findIndex((c) => c.id === over.id);
    if (from === -1 || to === -1) return;
    // use arrayMove locally then sync store
    reorderClips(from, to);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Clips
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
            {clips.length}
          </span>
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
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-primary/8">
            <Film className="h-5 w-5 text-primary/70" />
          </div>
          <p className="mt-2.5 text-xs font-medium text-foreground/80">No clips yet</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Drag on the timeline, use Auto-split, or press{" "}
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">N</kbd>{" "}
            to add one.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={clips.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-[42vh] space-y-1.5 overflow-y-auto pr-0.5">
              {clips.map((clip, i) => (
                <SortableClipItem
                  key={clip.id}
                  clip={clip}
                  index={i}
                  thumbnail={thumbnails[clip.id]}
                  selected={clip.id === selectedClipId}
                  onSelect={() => {
                    selectClip(clip.id);
                    videoController.seek(clip.start);
                  }}
                  onToggle={() => updateClip(clip.id, { enabled: !clip.enabled })}
                  onDuplicate={() => duplicateClip(clip.id)}
                  onRemove={() => removeClip(clip.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface ItemProps {
  clip: import("@/lib/types").Clip;
  index: number;
  thumbnail?: string;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function SortableClipItem({
  clip,
  index,
  thumbnail,
  selected,
  onSelect,
  onToggle,
  onDuplicate,
  onRemove,
}: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id });
  const dur = clip.end - clip.start;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative flex cursor-pointer items-stretch gap-0 overflow-hidden rounded-lg border transition-all ${
        selected
          ? "border-primary/60 bg-primary/8 shadow-[0_0_0_1px_var(--primary)]"
          : "border-border/50 bg-card/40 hover:border-border hover:bg-card/70"
      } ${isDragging ? "opacity-90 shadow-2xl" : ""} ${
        clip.enabled ? "" : "opacity-50"
      }`}
    >
      {/* drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="flex w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* thumbnail */}
      <div className="relative h-12 w-20 shrink-0 overflow-hidden bg-black/60">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={clip.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          </div>
        )}
        {/* color stripe + index */}
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: clip.color }} />
        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 font-mono text-[8px] text-white/90">
          {index + 1}
        </span>
      </div>

      {/* info */}
      <div className="min-w-0 flex-1 px-2 py-1.5">
        <p className="truncate text-xs font-medium" title={clip.name}>
          {clip.name}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5 font-mono">
            <Clock className="h-2.5 w-2.5" />
            {formatTime(dur, true)}
          </span>
          <span className="font-mono opacity-70">
            {formatTime(clip.start)}–{formatTime(clip.end)}
          </span>
        </div>
      </div>

      {/* actions */}
      <div className="flex shrink-0 items-center gap-0.5 pr-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate (D)"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title="Toggle visibility"
        >
          {clip.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Delete (Del)"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

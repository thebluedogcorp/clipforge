"use client";

import { useState } from "react";
import {
  Subtitles,
  Loader2,
  Sparkles,
  Trash2,
  Plus,
  Type,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useClipper } from "@/lib/store";
import { videoController } from "@/lib/video-controller";
import { formatTime, uid } from "@/lib/format";
import { toast } from "sonner";
import type { CaptionSegment } from "@/lib/types";

export function CaptionsPanel() {
  const transcript = useClipper((s) => s.transcript);
  const duration = useClipper((s) => s.duration);
  const captions = useClipper((s) => s.captions);
  const setCaptions = useClipper((s) => s.setCaptions);
  const showCaptions = useClipper((s) => s.showCaptions);
  const toggleCaptions = useClipper((s) => s.toggleCaptions);
  const captionStyle = useClipper((s) => s.captionStyle);
  const setCaptionStyle = useClipper((s) => s.setCaptionStyle);
  const setBusy = useClipper((s) => s.setBusy);
  const [loading, setLoading] = useState(false);

  const canGenerate = !!transcript && duration > 0 && !loading;

  async function generate() {
    if (!transcript || !duration) return;
    setLoading(true);
    setBusy({ label: "Generating captions…", progress: 0.4 });
    try {
      const res = await fetch("/api/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, duration, maxPerCaption: 7 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Caption generation failed");
      const segs: CaptionSegment[] = (json.segments || []).map((s: any) => ({
        id: uid(),
        start: s.start,
        end: s.end,
        text: s.text,
      }));
      setCaptions(segs);
      setBusy({ label: "Done", progress: 1 });
      toast.success(`${segs.length} captions generated`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Caption generation failed";
      toast.error(msg);
    } finally {
      setLoading(false);
      setBusy(null);
    }
  }

  function updateCaption(id: string, patch: Partial<CaptionSegment>) {
    setCaptions(captions.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeCaption(id: string) {
    setCaptions(captions.filter((c) => c.id !== id));
  }
  function addCaption() {
    const last = captions[captions.length - 1];
    const start = last ? last.end : 0;
    setCaptions([
      ...captions,
      { id: uid(), start, end: Math.min(duration, start + 2), text: "New caption" },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Subtitles className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Captions
          </h3>
          <span className="text-foreground/60">{captions.length}</span>
        </div>
        {captions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={toggleCaptions}
          >
            {showCaptions ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {showCaptions ? "Visible" : "Hidden"}
          </Button>
        )}
      </div>

      <Button onClick={generate} disabled={!canGenerate} className="w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {captions.length ? "Regenerate captions" : "Generate AI captions"}
      </Button>

      {!transcript && (
        <p className="rounded-lg border border-border/50 bg-card/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Transcribe the video first, then generate timed captions.
        </p>
      )}

      {captions.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Type className="h-3.5 w-3.5" />
            Caption style
          </Label>
          <ToggleGroup
            type="single"
            value={captionStyle}
            onValueChange={(v) => v && setCaptionStyle(v as any)}
            className="grid w-full grid-cols-4 gap-1"
          >
            <ToggleGroupItem value="bold" className="text-[10px]">Bold</ToggleGroupItem>
            <ToggleGroupItem value="minimal" className="text-[10px]">Minimal</ToggleGroupItem>
            <ToggleGroupItem value="karaoke" className="text-[10px]">Karaoke</ToggleGroupItem>
            <ToggleGroupItem value="boxed" className="text-[10px]">Boxed</ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {captions.length > 0 ? (
        <ScrollArea className="h-[38vh] rounded-lg border border-border/50 bg-card/30">
          <div className="space-y-1.5 p-2">
            {captions.map((c, i) => (
              <div
                key={c.id}
                className="group rounded-lg border border-border/50 bg-background/40 p-2 transition-colors hover:border-primary/40"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => videoController.seek(c.start)}
                    className="font-mono text-[10px] text-muted-foreground hover:text-primary"
                    title="Jump to caption"
                  >
                    {formatTime(c.start)} → {formatTime(c.end)}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-5 w-5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                    onClick={() => removeCaption(c.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={c.text}
                  onChange={(e) => updateCaption(c.id, { text: e.target.value })}
                  className="h-7 border-none bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-xs text-muted-foreground"
              onClick={addCaption}
            >
              <Plus className="h-3.5 w-3.5" />
              Add caption
            </Button>
          </div>
        </ScrollArea>
      ) : (
        !loading && transcript && (
          <div className="rounded-lg border border-dashed border-border/60 p-5 text-center">
            <Subtitles className="mx-auto h-6 w-6 text-muted-foreground/60" />
            <p className="mt-2 text-xs text-muted-foreground">
              Generate short, punchy captions timed to the video.
            </p>
          </div>
        )
      )}
    </div>
  );
}

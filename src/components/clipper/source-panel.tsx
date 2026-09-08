"use client";

import { useRef, useState } from "react";
import { UploadCloud, Youtube, Link2, Film, Loader2, X, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useClipper } from "@/lib/store";
import { extractYouTubeId, formatTime } from "@/lib/format";
import { toast } from "sonner";
import type { VideoSource } from "@/lib/types";

export function SourcePanel() {
  const setSource = useClipper((s) => s.setSource);
  const source = useClipper((s) => s.source);
  const clearClips = useClipper((s) => s.clearClips);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) {
      toast.error("Please choose a video file");
      return;
    }
    const url = URL.createObjectURL(file);
    const vs: VideoSource = {
      kind: "file",
      url,
      name: file.name,
      duration: 0,
    };
    setSource(vs);
    clearClips();
    toast.success(`Loaded ${file.name}`);
  }

  async function loadYouTube() {
    const id = extractYouTubeId(ytUrl);
    if (!id) {
      toast.error("Couldn't parse a YouTube URL");
      return;
    }
    setYtLoading(true);
    try {
      const res = await fetch(`/api/youtube?url=${encodeURIComponent(ytUrl)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch YouTube metadata");
      }
      const data = await res.json();
      const vs: VideoSource = {
        kind: "youtube",
        url: data.embedUrl,
        name: data.title,
        duration: 0,
        thumbnail: data.thumbnail,
        youtubeId: data.id,
      };
      setSource(vs);
      clearClips();
      toast.success(`Loaded "${data.title}"`);
      setYtUrl("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "YouTube load failed");
    } finally {
      setYtLoading(false);
    }
  }

  if (source) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Source
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (source.kind === "file") URL.revokeObjectURL(source.url);
              setSource(null);
            }}
          >
            <X className="h-3.5 w-3.5" />
            Replace
          </Button>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          {source.kind === "file" ? (
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileVideo className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={source.name}>
                  {source.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatTime(source.duration) || "loading…"} · local file
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/15 text-red-400">
                  <Youtube className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug" title={source.name}>
                    {source.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">YouTube · embedded</p>
                </div>
              </div>
              {source.thumbnail && (
                <img
                  src={source.thumbnail}
                  alt={source.name}
                  className="h-20 w-full rounded-lg object-cover"
                />
              )}
            </div>
          )}
        </div>
        {source.kind === "youtube" && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-200/80">
            YouTube clips play &amp; preview here. To clip &amp; export, upload
            the file directly — browser security blocks downloading YouTube
            streams.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Source
      </h3>
      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file" className="gap-1.5 text-xs">
            <UploadCloud className="h-3.5 w-3.5" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="youtube" className="gap-1.5 text-xs">
            <Youtube className="h-3.5 w-3.5" />
            YouTube
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="mt-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border/70 hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">Drop video here</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                or click to browse · MP4, WebM, MOV…
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </TabsContent>

        <TabsContent value="youtube" className="mt-3 space-y-2">
          <Label htmlFor="yt-url" className="text-xs text-muted-foreground">
            Paste a YouTube link
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="yt-url"
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadYouTube()}
                placeholder="https://youtube.com/watch?v=…"
                className="pl-8"
              />
            </div>
            <Button onClick={loadYouTube} disabled={ytLoading} size="icon">
              {ytLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {["dQw4w9WgXcQ", "9bZkp7q19f0"].map((id) => (
              <Badge
                key={id}
                variant="secondary"
                className="cursor-pointer font-mono text-[10px] hover:bg-primary/20"
                onClick={() => setYtUrl(`https://youtu.be/${id}`)}
              >
                sample:{id}
              </Badge>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

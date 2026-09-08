"use client";

import { useState } from "react";
import {
  Download,
  Loader2,
  FileVideo,
  FileAudio,
  Image as ImageIcon,
  FileText,
  Check,
  AlertCircle,
  Package,
  Film,
  Crop,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClipper } from "@/lib/store";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { formatTime, formatBytes, buildSrt, uid } from "@/lib/format";
import { toast } from "sonner";
import type { ExportFormat, ExportJob } from "@/lib/types";

const FORMAT_META: Record<
  ExportFormat,
  { label: string; icon: typeof FileVideo; desc: string; mime: string; ext: string }
> = {
  mp4: { label: "MP4 Video", icon: FileVideo, desc: "H.264 + AAC · best compatibility", mime: "video/mp4", ext: "mp4" },
  webm: { label: "WebM Video", icon: Film, desc: "VP9 + Vorbis · web optimized", mime: "video/webm", ext: "webm" },
  gif: { label: "GIF Animation", icon: ImageIcon, desc: "Looping · social-ready", mime: "image/gif", ext: "gif" },
  mp3: { label: "MP3 Audio", icon: FileAudio, desc: "Audio only · 128 kbps", mime: "audio/mpeg", ext: "mp3" },
  srt: { label: "SRT Subtitles", icon: FileText, desc: "Caption sidecar", mime: "text/plain", ext: "srt" },
};

export function ExportPanel() {
  const clips = useClipper((s) => s.clips);
  const source = useClipper((s) => s.source);
  const captions = useClipper((s) => s.captions);
  const format = useClipper((s) => s.exportFormat);
  const setFormat = useClipper((s) => s.setExportFormat);
  const jobs = useClipper((s) => s.exportJobs);
  const addJob = useClipper((s) => s.addExportJob);
  const updateJob = useClipper((s) => s.updateExportJob);
  const clearJobs = useClipper((s) => s.clearExportJobs);
  const setBusy = useClipper((s) => s.setBusy);
  const aspect = useClipper((s) => s.aspect);
  const setAspect = useClipper((s) => s.setAspect);
  const burnCaptions = useClipper((s) => s.burnCaptions);
  const setBurnCaptions = useClipper((s) => s.setBurnCaptions);
  const [running, setRunning] = useState(false);

  const enabledClips = clips.filter((c) => c.enabled);
  const canExport = !!source && source.kind === "file" && enabledClips.length > 0;

  function downloadSrt(clipId?: string) {
    let caps = captions;
    if (clipId) {
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;
      caps = captions.filter((c) => c.start >= clip.start - 0.05 && c.end <= clip.end + 0.05);
      // shift to start at 0 for the clip
      caps = caps.map((c) => ({ ...c, start: c.start - clip.start, end: c.end - clip.start }));
    }
    if (caps.length === 0) {
      toast.error("No captions to export. Generate captions first.");
      return;
    }
    const srt = buildSrt(caps);
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const name = clipId
      ? `${clips.find((c) => c.id === clipId)?.name || "clip"}.srt`
      : "captions.srt";
    triggerDownload(url, name);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast.success("SRT downloaded");
  }

  async function exportClip(clipId: string) {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip || !source || source.kind !== "file") return;

    if (format === "srt") {
      downloadSrt(clipId);
      return;
    }

    const aspect = useClipper.getState().aspect;
    const burnCaptions = useClipper.getState().burnCaptions;
    const captions = useClipper.getState().captions;

    const job: ExportJob = {
      id: uid(),
      clipId,
      clipName: clip.name,
      format,
      status: "processing",
      progress: 0,
    };
    addJob(job);
    setRunning(true);

    try {
      const ffmpeg = await getFFmpeg();
      const inputExt = source.name.split(".").pop() || "mp4";
      const inputName = `in_${clipId}.${inputExt}`;
      const outName = `out_${clipId}.${FORMAT_META[format].ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(source.url));

      // if burning captions, write an .srt sidecar and build the filter chain
      let srtName: string | null = null;
      let captionFilter = "";
      if (burnCaptions && captions.length > 0 && (format === "mp4" || format === "webm")) {
        srtName = `subs_${clipId}.srt`;
        const clipCaps = captions
          .filter((c) => c.start >= clip.start - 0.05 && c.end <= clip.end + 0.05)
          .map((c) => ({ ...c, start: c.start - clip.start, end: c.end - clip.start }));
        const srt = buildSrt(clipCaps);
        await ffmpeg.writeFile(srtName, new TextEncoder().encode(srt));
        // subtitles filter with styled fontsdir; force_style for bold look
        captionFilter = `subtitles=${srtName}:force_style='FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2'`;
      }

      const onProg = ({ progress: p }: { progress: number }) => {
        const pr = Math.max(0, Math.min(1, p));
        updateJob(job.id, { progress: pr });
      };
      ffmpeg.on("progress", onProg);

      const args: string[] = ["-i", inputName, "-ss", String(clip.start), "-to", String(clip.end)];

      // build the video filter chain: crop to aspect + optional caption burn-in
      const vfParts: string[] = [];
      if (aspect !== "16:9") {
        // center-crop to the target aspect ratio using ffmpeg expressions.
        // a = source aspect (iw/ih). TGT = target aspect (aw/ah).
        // if source is wider than target → crop the sides (w = ih*TGT)
        // if source is taller than target → crop top/bottom (h = iw/TGT)
        const targets: Record<string, number> = {
          "9:16": 9 / 16,
          "1:1": 1,
          "4:5": 4 / 5,
        };
        const tgt = targets[aspect];
        vfParts.push(
          `crop='if(gt(a\\,${tgt})\\,ih*${tgt}\\,iw)':'if(gt(a\\,${tgt})\\,ih\\,iw/${tgt})'`
        );
      }
      if (captionFilter) vfParts.push(captionFilter);
      if (vfParts.length > 0) {
        // for gif we already set -vf below; append aspect crop there instead
        if (format !== "gif") {
          args.push("-vf", vfParts.join(","));
        }
      }

      if (format === "mp4") {
        args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k");
      } else if (format === "webm") {
        args.push("-c:v", "libvpx", "-b:v", "1M", "-c:a", "libvorbis");
      } else if (format === "gif") {
        // gif: merge aspect crop with the standard gif filter
        const gifVf = vfParts.length > 0
          ? `${vfParts.join(",")},fps=12,scale=480:-1:flags=lanczos`
          : "fps=12,scale=480:-1:flags=lanczos";
        args.push("-vf", gifVf, "-loop", "0");
      } else if (format === "mp3") {
        args.push("-vn", "-c:a", "libmp3lame", "-b:a", "128k");
      }
      args.push(outName);

      await ffmpeg.exec(args);
      ffmpeg.off("progress", onProg);

      const data = await ffmpeg.readFile(outName);
      const blob = new Blob([data as Uint8Array], { type: FORMAT_META[format].mime });
      const url = URL.createObjectURL(blob);

      updateJob(job.id, {
        status: "done",
        progress: 1,
        url,
        size: blob.size,
      });

      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outName);
        if (srtName) await ffmpeg.deleteFile(srtName);
      } catch {}
      toast.success(`${clip.name} exported`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed";
      updateJob(job.id, { status: "error", error: msg });
      toast.error(`${clip.name}: ${msg}`);
    } finally {
      setRunning(false);
    }
  }

  async function exportAll() {
    if (format === "srt") {
      downloadSrt();
      return;
    }
    setBusy({ label: "Exporting clips…", progress: 0 });
    for (let i = 0; i < enabledClips.length; i++) {
      setBusy({ label: `Exporting ${enabledClips[i].name}…`, progress: i / enabledClips.length });
      await exportClip(enabledClips[i].id);
    }
    setBusy(null);
    toast.success(`Exported ${enabledClips.length} clips`);
  }

  const Meta = FORMAT_META[format];
  const MetaIcon = Meta.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Export
        </h3>
      </div>

      {source?.kind === "youtube" && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-200/80">
          Export requires a local file. YouTube streams can&apos;t be re-encoded
          in-browser.
        </p>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Format</label>
        <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
          <SelectTrigger className="h-10">
            <div className="flex items-center gap-2">
              <MetaIcon className="h-4 w-4 text-primary" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FORMAT_META) as ExportFormat[]).map((f) => {
              const M = FORMAT_META[f];
              const Icon = M.icon;
              return (
                <SelectItem key={f} value={f}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{M.label}</span>
                      <span className="text-[10px] text-muted-foreground">{M.desc}</span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Aspect ratio crop (video formats only) */}
      {format !== "mp3" && format !== "srt" && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Crop className="h-3.5 w-3.5" />
            Aspect ratio
          </label>
          <div className="flex gap-1">
            {(["16:9", "9:16", "1:1", "4:5"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAspect(a)}
                className={`flex-1 rounded-lg border px-2 py-1.5 font-mono text-[11px] font-medium transition-colors ${
                  aspect === a
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          {aspect !== "16:9" && (
            <p className="text-[10px] text-muted-foreground/70">
              Center-cropped to {aspect} · matches the preview frame
            </p>
          )}
        </div>
      )}

      {/* Burn captions into video */}
      {(format === "mp4" || format === "webm") && captions.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/40 p-2.5">
          <div className="flex items-center gap-2">
            <Flame className={`h-4 w-4 ${burnCaptions ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <Label className="text-xs font-medium">Burn captions</Label>
              <p className="text-[10px] text-muted-foreground">
                Embed captions directly into the video
              </p>
            </div>
          </div>
          <Switch checked={burnCaptions} onCheckedChange={setBurnCaptions} />
        </div>
      )}

      <Button onClick={exportAll} disabled={!canExport && format !== "srt"} className="w-full gap-2">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Export {enabledClips.length} clip{enabledClips.length === 1 ? "" : "s"} · {Meta.label}
      </Button>

      {jobs.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{jobs.length} jobs</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearJobs}>
            Clear
          </Button>
        </div>
      )}

      <ScrollArea className="max-h-[42vh]">
        <div className="space-y-1.5">
          {jobs.slice().reverse().map((job) => {
            const M = FORMAT_META[job.format];
            const Icon = M.icon;
            return (
              <div
                key={job.id}
                className="rounded-lg border border-border/50 bg-card/40 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{job.clipName}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {M.ext} {job.size ? `· ${formatBytes(job.size)}` : ""}
                    </p>
                  </div>
                  {job.status === "processing" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  {job.status === "done" && <Check className="h-3.5 w-3.5 text-primary" />}
                  {job.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                  {job.status === "done" && job.url && (
                    <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                      <a href={job.url} download={`${job.clipName}.${M.ext}`}>
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
                {job.status === "processing" && (
                  <Progress value={job.progress * 100} className="mt-2 h-1" />
                )}
                {job.status === "error" && (
                  <p className="mt-1 text-[10px] text-destructive">{job.error}</p>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function triggerDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

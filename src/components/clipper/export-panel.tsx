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
  GitMerge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
  const stitchMode = useClipper((s) => s.stitchMode);
  const setStitchMode = useClipper((s) => s.setStitchMode);
  const crossfadeSec = useClipper((s) => s.crossfadeSec);
  const setCrossfadeSec = useClipper((s) => s.setCrossfadeSec);
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
    const captionColor = useClipper.getState().captionColor;
    const captionSize = useClipper.getState().captionSize;
    const captionPosition = useClipper.getState().captionPosition;

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

      // probe the actual video dimensions by running a tiny ffprobe-style
      // pass (we use ffmpeg -i with null output and parse the log).
      let videoHeight = 720; // fallback
      let videoWidth = 1280;
      try {
        const probeLogs: string[] = [];
        const onLog = ({ message }: { message: string }) => {
          probeLogs.push(message);
        };
        ffmpeg.on("log", onLog);
        await ffmpeg.exec(["-i", inputName, "-t", "0.1", "-f", "null", "-"]);
        ffmpeg.off("log", onLog);
        // parse "Stream #0:0... Video..., 1280x720..."
        const dimLine = probeLogs.find((l) => /\d+x\d+/.test(l) && /Video|video/.test(l));
        if (dimLine) {
          const m = dimLine.match(/(\d{2,5})x(\d{2,5})/);
          if (m) {
            videoWidth = parseInt(m[1], 10);
            videoHeight = parseInt(m[2], 10);
          }
        }
      } catch {
        // probing is best-effort; fall back to 720p
      }

      // if burning captions, write the .srt sidecar + a font file into the
      // virtual FS, then build a subtitles filter that references them.
      // ffmpeg.wasm ships with libass but NO fonts, so we must supply one
      // and point `fontsdir` at it — otherwise the filter silently renders
      // nothing ("can't find selected font provider").
      let srtName: string | null = null;
      let captionFilter = "";
      if (burnCaptions && captions.length > 0 && (format === "mp4" || format === "webm")) {
        srtName = `subs_${clipId}.srt`;
        const clipCaps = captions
          .filter((c) => c.start >= clip.start - 0.05 && c.end <= clip.end + 0.05)
          .map((c) => ({ ...c, start: c.start - clip.start, end: c.end - clip.start }));
        const srt = buildSrt(clipCaps);
        await ffmpeg.writeFile(srtName, new TextEncoder().encode(srt));

        // write a bold TTF into a /tmp/fonts dir inside the virtual FS
        try {
          await ffmpeg.createDir("/tmp/fonts").catch(() => {});
          const fontBlob = await (await fetch("/fonts/DejaVuSans-Bold.ttf")).arrayBuffer();
          await ffmpeg.writeFile("/tmp/fonts/DejaVuSans-Bold.ttf", new Uint8Array(fontBlob));
        } catch {
          // font load is best-effort
        }

        // compute the EXPORT height — if aspect crop changes the dimensions,
        // the caption position should be relative to the cropped frame.
        let exportHeight = videoHeight;
        let exportWidth = videoWidth;
        if (aspect !== "16:9") {
          const srcA = videoWidth / videoHeight;
          const targets: Record<string, number> = {
            "9:16": 9 / 16,
            "1:1": 1,
            "4:5": 4 / 5,
          };
          const tgt = targets[aspect];
          if (srcA > tgt) {
            // source wider than target → crop sides → width = height * tgt
            exportWidth = Math.round(videoHeight * tgt);
          } else {
            // source taller → crop top/bottom → height = width / tgt
            exportHeight = Math.round(videoWidth / tgt);
          }
        }

        // subtitles filter: fontsdir tells libass where to look; force_style
        // sets the visual look derived from the in-app caption editor.
        // Convert hex captionColor (#rrggbb) to ASS &HBBGGRR.
        const hex = captionColor.replace("#", "");
        const assColor = `&H00${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`.toUpperCase();
        // Map the in-app vertical % (10=top, 90=bottom) to ASS MarginV.
        // The in-app overlay uses `top: position%` of the preview frame.
        // ASS Alignment=2 is bottom-center; MarginV = pixels from bottom.
        // So MarginV = (1 - position/100) * exportHeight, but we also need
        // to account for the caption's own line height (~1.2 * fontSize).
        // Empirically: MarginV ≈ (100 - position) / 100 * exportHeight * 0.85
        const marginV = Math.round(((100 - captionPosition) / 100) * exportHeight * 0.85);
        // scale font size proportionally if the export is much smaller/larger
        const scaledSize = Math.round(
          captionSize * (exportHeight / 720 > 0.5 ? Math.min(1.5, exportHeight / 720) : 1)
        );
        void exportWidth; // referenced for clarity
        captionFilter =
          `subtitles=${srtName}:fontsdir=/tmp/fonts:force_style='FontName=DejaVu Sans,FontSize=${scaledSize},PrimaryColour=${assColor},OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,MarginV=${marginV},Alignment=2'`;
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
    if (stitchMode && enabledClips.length > 1 && format !== "gif" && format !== "mp3") {
      await stitchExport();
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

  /**
   * Stitch all enabled clips into a single output video, with optional
   * crossfade transitions between them. Uses ffmpeg's xfade filter.
   */
  async function stitchExport() {
    if (!source || source.kind !== "file") return;
    const xf = useClipper.getState().crossfadeSec;
    const aspectVal = useClipper.getState().aspect;
    const burn = useClipper.getState().burnCaptions;
    const caps = useClipper.getState().captions;
    const capColor = useClipper.getState().captionColor;
    const capSize = useClipper.getState().captionSize;
    const capPos = useClipper.getState().captionPosition;

    const job: ExportJob = {
      id: uid(),
      clipId: "stitch",
      clipName: "Stitched compilation",
      format,
      status: "processing",
      progress: 0,
    };
    addJob(job);
    setRunning(true);
    setBusy({ label: "Stitching clips…", progress: 0.05 });

    try {
      const ffmpeg = await getFFmpeg();
      const inputExt = source.name.split(".").pop() || "mp4";
      const inputName = `in_stitch.${inputExt}`;
      await ffmpeg.writeFile(inputName, await fetchFile(source.url));

      // write font for burn-in if needed
      if (burn && caps.length > 0) {
        try {
          await ffmpeg.createDir("/tmp/fonts").catch(() => {});
          const fontBlob = await (await fetch("/fonts/DejaVuSans-Bold.ttf")).arrayBuffer();
          await ffmpeg.writeFile("/tmp/fonts/DejaVuSans-Bold.ttf", new Uint8Array(fontBlob));
        } catch {}
      }

      // extract each clip as a separate segment file
      const segNames: string[] = [];
      const segDurations: number[] = [];
      for (let i = 0; i < enabledClips.length; i++) {
        const clip = enabledClips[i];
        const segName = `seg_${i}.${FORMAT_META[format].ext}`;
        const segArgs: string[] = [
          "-i", inputName,
          "-ss", String(clip.start),
          "-to", String(clip.end),
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "23",
          "-c:a", "aac",
          "-b:a", "128k",
        ];
        // aspect crop
        if (aspectVal !== "16:9") {
          const targets: Record<string, number> = {
            "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5,
          };
          const tgt = targets[aspectVal];
          segArgs.push("-vf", `crop='if(gt(a\\,${tgt})\\,ih*${tgt}\\,iw)':'if(gt(a\\,${tgt})\\,ih\\,iw/${tgt})'`);
          segArgs.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "23");
        }
        // burn captions for this segment
        if (burn && caps.length > 0) {
          const segCaps = caps
            .filter((c) => c.start >= clip.start - 0.05 && c.end <= clip.end + 0.05)
            .map((c) => ({ ...c, start: c.start - clip.start, end: c.end - clip.start }));
          if (segCaps.length > 0) {
            const srtName = `subs_${i}.srt`;
            await ffmpeg.writeFile(srtName, new TextEncoder().encode(buildSrt(segCaps)));
            const hex = capColor.replace("#", "");
            const assColor = `&H00${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`.toUpperCase();
            const marginV = Math.round(((100 - capPos) / 100) * 720 * 0.85);
            const burnFilter = `subtitles=${srtName}:fontsdir=/tmp/fonts:force_style='FontName=DejaVu Sans,FontSize=${capSize},PrimaryColour=${assColor},OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,MarginV=${marginV},Alignment=2'`;
            const existingVf = segArgs.indexOf("-vf");
            if (existingVf >= 0) {
              segArgs[existingVf + 1] = segArgs[existingVf + 1] + "," + burnFilter;
            } else {
              segArgs.push("-vf", burnFilter);
            }
          }
        }
        segArgs.push(segName);
        await ffmpeg.exec(segArgs);
        segNames.push(segName);
        // read duration via probe
        let segDur = clip.end - clip.start;
        try {
          const probeLogs: string[] = [];
          const onLog = ({ message }: { message: string }) => probeLogs.push(message);
          ffmpeg.on("log", onLog);
          await ffmpeg.exec(["-i", segName, "-t", "0.1", "-f", "null", "-"]);
          ffmpeg.off("log", onLog);
          const durLine = probeLogs.find((l) => /Duration:\s*\d{2}:\d{2}:\d{2}\.\d+/.test(l));
          if (durLine) {
            const m = durLine.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d+)/);
            if (m) segDur = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 100;
          }
        } catch {}
        segDurations.push(segDur);
        setBusy({ label: `Preparing clip ${i + 1}/${enabledClips.length}…`, progress: 0.05 + (i / enabledClips.length) * 0.4 });
      }

      setBusy({ label: "Stitching with crossfade…", progress: 0.5 });

      // build the concat + xfade filter chain
      const outName = `out_stitch.${FORMAT_META[format].ext}`;
      const inputs: string[] = [];
      for (const n of segNames) inputs.push("-i", n);

      if (xf > 0 && segNames.length > 1) {
        // build xfade chain: [0:v][1:v]xfade=duration=D:offset=T1[v01]; [v01][2]xfade...
        const filterParts: string[] = [];
        const totalSegs = segNames.length;
        // For 2 segments: one xfade, output label = "vout"
        // For 3+: first xfade -> [v0], subsequent -> [v1]...[vout]
        const firstLabel = totalSegs === 2 ? "vout" : "v0";
        filterParts.push(
          `[0:v][1:v]xfade=transition=fade:duration=${xf}:offset=${(segDurations[0] - xf).toFixed(3)}[${firstLabel}]`
        );
        let accumDur = segDurations[0] + segDurations[1] - xf;
        for (let i = 2; i < totalSegs; i++) {
          const offset = (accumDur - xf).toFixed(3);
          const label = i === totalSegs - 1 ? "vout" : `v${i - 1}`;
          filterParts.push(`[v${i - 2}][${i}:v]xfade=transition=fade:duration=${xf}:offset=${offset}[${label}]`);
          accumDur += segDurations[i] - xf;
        }
        // audio crossfade (acrossfade) chain
        if (totalSegs === 2) {
          filterParts.push(`[0:a][1:a]acrossfade=d=${xf}[aout]`);
        } else {
          filterParts.push(`[0:a][1:a]acrossfade=d=${xf}[a0]`);
          for (let i = 2; i < totalSegs; i++) {
            const label = i === totalSegs - 1 ? "aout" : `a${i - 1}`;
            filterParts.push(`[a${i - 2}][${i}:a]acrossfade=d=${xf}[${label}]`);
          }
        }
        const finalV = "[vout]";
        const finalA = "[aout]";
        const mapArgs = ["-map", finalV, "-map", finalA];
        const cArgs = format === "mp4"
          ? ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k"]
          : ["-c:v", "libvpx", "-b:v", "1M", "-c:a", "libvorbis"];
        const stitchArgs = [
          ...inputs,
          "-filter_complex", filterParts.join(";"),
          ...mapArgs,
          ...cArgs,
          outName,
        ];
        await ffmpeg.exec(stitchArgs);
      } else {
        // no crossfade — simple concat demuxer
        const concatList = segNames.map((n) => `file '${n}'`).join("\n");
        await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatList));
        await ffmpeg.exec([
          "-f", "concat", "-safe", "0", "-i", "concat.txt",
          "-c", "copy",
          outName,
        ]);
      }

      const data = await ffmpeg.readFile(outName);
      const blob = new Blob([data as Uint8Array], { type: FORMAT_META[format].mime });
      const url = URL.createObjectURL(blob);
      updateJob(job.id, { status: "done", progress: 1, url, size: blob.size });

      // cleanup
      try {
        await ffmpeg.deleteFile(inputName);
        for (const n of segNames) await ffmpeg.deleteFile(n);
        await ffmpeg.deleteFile(outName);
      } catch {}

      setBusy(null);
      toast.success("Stitched compilation exported");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stitch export failed";
      updateJob(job.id, { status: "error", error: msg });
      toast.error(msg);
    } finally {
      setRunning(false);
      setBusy(null);
    }
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

      {/* Stitch mode (compile all clips into one video with crossfade) */}
      {format !== "gif" && format !== "mp3" && format !== "srt" && enabledClips.length > 1 && (
        <div className="space-y-2.5 rounded-lg border border-border/50 bg-card/40 p-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GitMerge className={`h-4 w-4 ${stitchMode ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <Label className="text-xs font-medium">Stitch into one video</Label>
                <p className="text-[10px] text-muted-foreground">
                  Compile {enabledClips.length} clips into a single file
                </p>
              </div>
            </div>
            <Switch checked={stitchMode} onCheckedChange={setStitchMode} />
          </div>
          {stitchMode && (
            <div className="space-y-1 animate-fade-in">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">Crossfade duration</Label>
                <span className="font-mono text-[11px] text-foreground/80">{crossfadeSec.toFixed(1)}s</span>
              </div>
              <Slider
                value={[crossfadeSec]}
                min={0}
                max={2}
                step={0.1}
                onValueChange={([v]) => setCrossfadeSec(v)}
              />
              {crossfadeSec === 0 && (
                <p className="text-[10px] text-muted-foreground/70">
                  No transition — clips are concatenated back-to-back.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <Button onClick={exportAll} disabled={!canExport && format !== "srt"} className="w-full gap-2">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {stitchMode && enabledClips.length > 1 && format !== "gif" && format !== "mp3" && format !== "srt"
          ? `Stitch ${enabledClips.length} clips · ${Meta.label}`
          : `Export ${enabledClips.length} clip${enabledClips.length === 1 ? "" : "s"} · ${Meta.label}`}
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

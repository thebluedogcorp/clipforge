"use client";

import { useState } from "react";
import { Mic, Loader2, Copy, Check, AlertCircle, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClipper } from "@/lib/store";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { toast } from "sonner";
import { suggestMood } from "@/lib/mood-detector";
import { useMemo } from "react";

export function TranscriptionPanel() {
  const source = useClipper((s) => s.source);
  const transcript = useClipper((s) => s.transcript);
  const setTranscript = useClipper((s) => s.setTranscript);
  const setBusy = useClipper((s) => s.setBusy);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !source || source.kind !== "file" || loading;

  async function transcribe() {
    if (!source || source.kind !== "file") return;
    setLoading(true);
    setError(null);
    setBusy({ label: "Extracting audio…", progress: 0.1 });
    try {
      const ffmpeg = await getFFmpeg();
      setBusy({ label: "Extracting audio…", progress: 0.25 });

      const inputName = "input." + (source.name.split(".").pop() || "mp4");
      const outName = "audio.wav";

      await ffmpeg.writeFile(inputName, await fetchFile(source.url));
      setBusy({ label: "Extracting audio…", progress: 0.4 });

      // extract mono 16kHz WAV PCM — required by the ASR service (WAV/WebM)
      let progress = 0.4;
      ffmpeg.on("progress", ({ progress: p }) => {
        progress = 0.4 + Math.max(0, Math.min(1, p)) * 0.3;
        setBusy({ label: "Extracting audio…", progress });
      });

      await ffmpeg.exec([
        "-i", inputName,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "pcm_s16le",
        outName,
      ]);

      const data = await ffmpeg.readFile(outName);
      const blob = new Blob([data as Uint8Array], { type: "audio/wav" });

      // cleanup
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outName);
      } catch {}

      setBusy({ label: "Transcribing with AI…", progress: 0.7 });

      const form = new FormData();
      form.append("audio", blob, "audio.wav");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Transcription failed");

      setTranscript(json.text);
      setBusy({ label: "Done", progress: 1 });
      toast.success("Transcription ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transcription failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setBusy(null);
    }
  }

  async function copyText() {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Transcript
          </h3>
        </div>
        {transcript && (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={copyText}>
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </div>

      <Button
        onClick={transcribe}
        disabled={disabled}
        className="w-full gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {transcript ? "Re-transcribe" : "Transcribe with AI"}
      </Button>

      {source?.kind === "youtube" && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-200/80">
          Upload the video file to enable transcription — YouTube streams can&apos;t
          be processed in-browser.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-[11px] text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {transcript ? (
        <>
          {/* Mood detection */}
          <MoodDisplay transcript={transcript} />
          <ScrollArea className="h-[40vh] rounded-lg border border-border/50 bg-card/40">
            <div className="p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {transcript}
              </p>
            </div>
          </ScrollArea>
        </>
      ) : (
        !loading && (
          <div className="space-y-3 rounded-xl border border-border/50 bg-gradient-to-b from-card/60 to-card/30 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                <Mic className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground/90">Unlock your audio</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Generate a searchable transcript to edit captions or jump to
                  any moment instantly.
                </p>
              </div>
            </div>
            {/* skeleton preview of upcoming text */}
            <div className="space-y-1.5 rounded-lg bg-background/40 p-2.5">
              {[92, 78, 84, 60].map((w, i) => (
                <div
                  key={i}
                  className="h-2.5 rounded-full shimmer"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <FileText className="h-3 w-3" />
              Runs entirely in your browser · audio is never uploaded
            </div>
          </div>
        )
      )}

      {transcript && (
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="min-h-[80px] resize-y text-xs"
          placeholder="Edit transcript…"
        />
      )}
    </div>
  );
}

function MoodDisplay({ transcript }: { transcript: string }) {
  const mood = useMemo(() => suggestMood(transcript), [transcript]);
  if (mood.mood === "neutral") return null;
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-2.5 animate-fade-in">
      <span className="text-2xl">{mood.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-primary">{mood.label}</p>
        <p className="text-[10px] text-muted-foreground">{mood.hint}</p>
      </div>
      <div className="flex gap-1">
        {Object.entries(mood.scores).map(([m, s]) => (
          s > 0 && (
            <div key={m} className="flex flex-col items-center" title={`${m}: ${s}`}>
              <div
                className="w-1.5 rounded-full bg-primary/40"
                style={{ height: `${Math.min(s * 8, 24)}px` }}
              />
            </div>
          )
        ))}
      </div>
    </div>
  );
}

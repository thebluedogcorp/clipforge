"use client";

import { useEffect, useState } from "react";
import { Settings, Download, Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DepStatus {
  ytDlp: { bundled: boolean; system: boolean; installed: boolean };
  ffmpeg: { bundled: boolean; system: boolean; installed: boolean };
}

export function DepsInstaller() {
  const [status, setStatus] = useState<DepStatus | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkStatus() {
    setChecking(true);
    try {
      const res = await fetch("/api/install-deps?status=check");
      const data = await res.json();
      setStatus(data);
    } catch {
      // Running in dev — API might not be available
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function installTool(tool: "yt-dlp" | "ffmpeg") {
    setInstalling(tool);
    toast.info(`Downloading ${tool}…`);
    try {
      const res = await fetch("/api/install-deps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${tool} installed: ${data.message}`);
      } else {
        toast.error(`${tool} install failed: ${data.error}`);
      }
      await checkStatus();
    } catch (err) {
      toast.error(`${tool} install failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dependencies
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={checkStatus}
          disabled={checking}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
          Check
        </Button>
      </div>

      <div className="space-y-2">
        <DepRow
          name="yt-dlp"
          description="Downloads YouTube videos for clipping & transcription"
          status={status?.ytDlp}
          installing={installing === "yt-dlp"}
          onInstall={() => installTool("yt-dlp")}
        />
        <DepRow
          name="ffmpeg"
          description="Video processing engine (cutting, reframing, captions)"
          status={status?.ffmpeg}
          installing={installing === "ffmpeg"}
          onInstall={() => installTool("ffmpeg")}
        />
      </div>

      <div className="rounded-lg border border-border/50 bg-card/40 p-2.5">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          These tools run locally on your machine. yt-dlp downloads videos from
          YouTube. ffmpeg processes them (cutting, captions, effects). The local
          Whisper model for transcription downloads automatically on first use.
        </p>
      </div>
    </div>
  );
}

function DepRow({
  name,
  description,
  status,
  installing,
  onInstall,
}: {
  name: string;
  description: string;
  status?: { bundled: boolean; system: boolean; installed: boolean };
  installing: boolean;
  onInstall: () => void;
}) {
  const installed = status?.installed;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/40 p-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium">{name}</p>
          {installed === true && (
            <Badge variant="secondary" className="h-4 gap-0.5 px-1 text-[9px] text-primary">
              <Check className="h-2.5 w-2.5" />
              {status?.bundled ? "Bundled" : "System"}
            </Badge>
          )}
          {installed === false && (
            <Badge variant="secondary" className="h-4 gap-0.5 px-1 text-[9px] text-amber-400">
              <AlertCircle className="h-2.5 w-2.5" />
              Not installed
            </Badge>
          )}
          {installed === undefined && (
            <Badge variant="secondary" className="h-4 gap-0.5 px-1 text-[9px] text-muted-foreground">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Checking…
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{description}</p>
      </div>
      {installed === false && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={onInstall}
          disabled={installing}
        >
          {installing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Install
        </Button>
      )}
    </div>
  );
}

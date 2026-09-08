"use client";

import { useEffect, useState } from "react";
import { Circle, Cpu, Mic, ZoomIn, Keyboard } from "lucide-react";
import { useClipper } from "@/lib/store";
import { isFFmpegReady } from "@/lib/ffmpeg";
import { formatTime } from "@/lib/format";

export function Footer() {
  const currentTime = useClipper((s) => s.currentTime);
  const duration = useClipper((s) => s.duration);
  const zoom = useClipper((s) => s.zoom);
  const transcript = useClipper((s) => s.transcript);
  const [ffmpegReady, setFfmpegReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    isFFmpegReady().then((r) => mounted && setFfmpegReady(r));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <footer className="mt-auto h-9 shrink-0 border-t border-border/60 glass">
      <div className="flex h-full items-center justify-between px-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" />
            <span className="font-mono">FFmpeg.wasm</span>
            <span
              className={
                ffmpegReady
                  ? "text-primary"
                  : "text-amber-400"
              }
            >
              {ffmpegReady ? "ready" : "loading…"}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            <span className="font-mono">ASR</span>
            <span className={transcript ? "text-primary" : ""}>
              {transcript ? "transcribed" : "idle"}
            </span>
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <ZoomIn className="h-3.5 w-3.5" />
            <span className="font-mono">{zoom.toFixed(0)}px/s</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-1.5 font-mono md:flex">
            <Keyboard className="h-3.5 w-3.5" />
            Space · play/pause
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Circle className="h-2 w-2 fill-primary text-primary pulse-dot" />
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </footer>
  );
}

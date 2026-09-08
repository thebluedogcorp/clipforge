"use client";

import { Scissors, Download, Package, Sparkles, Github, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useClipper } from "@/lib/store";
import { formatShort } from "@/lib/format";

export function Header() {
  const clips = useClipper((s) => s.clips);
  const duration = useClipper((s) => s.duration);
  const source = useClipper((s) => s.source);

  const totalClipDur = clips
    .filter((c) => c.enabled)
    .reduce((acc, c) => acc + (c.end - c.start), 0);

  return (
    <header className="sticky top-0 z-50 h-14 shrink-0 border-b border-border/60 glass">
      <div className="flex h-full items-center justify-between px-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg glow-primary">
            <Scissors className="h-4.5 w-4.5" strokeWidth={2.5} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight">
              Clip<span className="text-primary">Forge</span>
            </span>
            <Badge
              variant="secondary"
              className="h-5 gap-1 px-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Beta
            </Badge>
          </div>
        </div>

        {/* Center stats */}
        {source && (
          <div className="hidden items-center gap-5 md:flex">
            <Stat label="Source" value={source.kind === "youtube" ? "YouTube" : "Local"} />
            <Stat label="Duration" value={formatShort(duration)} />
            <Stat label="Clips" value={String(clips.length)} />
            <Stat label="Clip time" value={formatShort(totalClipDur)} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Package .exe</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Run ClipForge as a Desktop App
                </DialogTitle>
                <DialogDescription>
                  ClipForge is a local-first web app. Bundle it into a single
                  executable that launches on <code>localhost</code> and opens
                  your default browser — no install required.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <Step n={1} title="Build the standalone server">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    bun run build
                  </code>{" "}
                  produces a self-contained Next.js server in{" "}
                  <code className="text-xs">.next/standalone</code>.
                </Step>
                <Step n={2} title="Compile to a single binary">
                  Use Bun&apos;s native compiler to produce a single{" "}
                  <code className="text-xs">.exe</code> (Windows) / binary
                  (macOS/Linux):
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-border/60 bg-muted/60 p-3 text-xs leading-relaxed">
{`bun build \\
  --compile \\
  --outfile clipforge \\
  server.ts`}
                  </pre>
                </Step>
                <Step n={3} title="Auto-open the browser">
                  The launcher starts the server on{" "}
                  <code className="text-xs">http://localhost:3000</code> and
                  opens it in the default browser, then keeps running until you
                  close the window.
                </Step>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                  Tip: ffmpeg.wasm runs entirely in the browser, so the .exe
                  stays tiny — no native FFmpeg dependency needed.
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button asChild variant="ghost" size="icon" className="text-muted-foreground">
            <a
              href="https://github.com/topics/opus-clip-alternative"
              target="_blank"
              rel="noreferrer"
              aria-label="View similar open-source apps"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => useClipper.getState().setShortcutsOpen(true)}
            aria-label="Keyboard shortcuts"
            title="Shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            className="gap-2"
            disabled={clips.length === 0}
            onClick={() => useClipper.getState().setActivePanel("export")}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export All</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-none">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {n}
      </div>
      <div className="space-y-1 pt-0.5">
        <p className="font-medium text-foreground">{title}</p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

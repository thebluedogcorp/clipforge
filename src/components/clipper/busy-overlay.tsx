"use client";

import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useClipper } from "@/lib/store";

export function BusyOverlay() {
  const busy = useClipper((s) => s.busy);
  if (!busy) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="w-[320px] animate-scale-in rounded-2xl border border-border/60 bg-card p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{busy.label}</p>
            <p className="text-[11px] text-muted-foreground">
              Processing in your browser · no upload
            </p>
          </div>
        </div>
        <Progress value={busy.progress * 100} className="mt-4 h-1.5" />
      </div>
    </div>
  );
}

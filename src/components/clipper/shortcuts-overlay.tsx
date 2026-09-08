"use client";

import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useClipper } from "@/lib/store";
import { SHORTCUTS } from "@/lib/use-keyboard-shortcuts";

const GROUPS: ShortcutsProps["group"][] = ["Playback", "Editing", "View", "Navigation"];

export function ShortcutsOverlay() {
  const open = useClipper((s) => s.shortcutsOpen);
  const setOpen = useClipper((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border/50 p-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pro-style controls — works while the video is focused.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            {GROUPS.map((g) => (
              <div key={g} className="space-y-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {g}
                </h4>
                <div className="space-y-1.5">
                  {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                    <div
                      key={s.keys}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-xs text-muted-foreground">{s.action}</span>
                      <div className="flex shrink-0 gap-1">
                        {s.keys.split(" · ").map((k, i) => (
                          <kbd
                            key={i}
                            className="rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground/80 shadow-sm"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
          <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
            <Keyboard className="h-3 w-3" />
            Tip
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">?</kbd> anytime to reopen this.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ShortcutsProps = (typeof SHORTCUTS)[number];

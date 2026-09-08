"use client";

import { useEffect } from "react";
import { useClipper } from "@/lib/store";
import { videoController } from "@/lib/video-controller";
import { clamp } from "@/lib/format";

/**
 * Global keyboard shortcuts for the editor.
 *   Space       play / pause
 *   J / K / L   reverse · pause · forward (pro-style shuttle)
 *   ← / →       -5s / +5s
 *   Shift+←/→   -1s / +1s (frame-ish)
 *   I / O       mark in / mark out
 *   Enter       create a clip from in/out marks
 *   Delete / ⌫  delete the selected clip
 *   M           toggle mute
 *   C           toggle captions
 *   + / -       zoom in / out
 *   1 / 2 / 3   switch right panel: clip / transcript / export
 *   ?           show shortcuts overlay
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target.isContentEditable ||
        target.getAttribute("contenteditable") === "true";

      // '?' works even from inputs is not desired — skip when typing
      if (editable) return;

      // allow the shortcuts overlay toggle regardless of meta state
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        useClipper.getState().setShortcutsOpen(true);
        return;
      }
      if (e.key === "Escape") {
        const s = useClipper.getState();
        if (s.shortcutsOpen) s.setShortcutsOpen(false);
        return;
      }

      const s = useClipper.getState();
      const t = videoController.currentTime;
      const dur = s.duration || 0;
      const step = e.shiftKey ? 1 : 5;

      // Shift+1..9 → jump to clip N (select + seek to its start)
      if (e.shiftKey && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const clip = s.clips[idx];
        if (clip) {
          e.preventDefault();
          s.selectClip(clip.id);
          videoController.seek(clip.start);
        }
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          videoController.toggle();
          break;
        case "j":
          e.preventDefault();
          videoController.seek(t - 10);
          break;
        case "l":
          e.preventDefault();
          videoController.seek(t + 10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          videoController.seek(t - step);
          break;
        case "ArrowRight":
          e.preventDefault();
          videoController.seek(t + step);
          break;
        case "Home":
          e.preventDefault();
          videoController.seek(0);
          break;
        case "End":
          e.preventDefault();
          videoController.seek(dur);
          break;
        case "i":
        case "I":
          e.preventDefault();
          s.setInMark(t);
          break;
        case "o":
        case "O":
          e.preventDefault();
          s.setOutMark(t);
          break;
        case "Enter":
          if (s.inMark != null && s.outMark != null) {
            e.preventDefault();
            s.makeClipFromMarks();
          }
          break;
        case "Delete":
        case "Backspace":
          if (s.selectedClipId) {
            e.preventDefault();
            s.removeClip(s.selectedClipId);
          }
          break;
        case "d":
        case "D":
          if (s.selectedClipId) {
            e.preventDefault();
            s.duplicateClip(s.selectedClipId);
          }
          break;
        case "m":
        case "M":
          e.preventDefault();
          s.toggleMute();
          videoController.toggleMute();
          break;
        case "c":
        case "C":
          e.preventDefault();
          s.toggleCaptions();
          break;
        case "+":
        case "=":
          e.preventDefault();
          s.setZoom(s.zoom * 1.4);
          break;
        case "-":
        case "_":
          e.preventDefault();
          s.setZoom(s.zoom / 1.4);
          break;
        case "1":
          e.preventDefault();
          s.setActivePanel("clips");
          break;
        case "2":
          e.preventDefault();
          s.setActivePanel("transcript");
          break;
        case "3":
          e.preventDefault();
          s.setActivePanel("captions");
          break;
        case "4":
          e.preventDefault();
          s.setActivePanel("export");
          break;
        case "5":
          e.preventDefault();
          s.setActivePanel("filters");
          break;
        case "n":
        case "N":
          e.preventDefault();
          if (dur > 0) s.addClip();
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export const SHORTCUTS: {
  keys: string;
  action: string;
  group: "Playback" | "Editing" | "Navigation" | "View";
}[] = [
  { keys: "Space · K", action: "Play / pause", group: "Playback" },
  { keys: "J", action: "Rewind 10s", group: "Playback" },
  { keys: "L", action: "Forward 10s", group: "Playback" },
  { keys: "← / →", action: "Step 5s", group: "Playback" },
  { keys: "Shift ← →", action: "Step 1s", group: "Playback" },
  { keys: "Home / End", action: "Jump to start / end", group: "Playback" },
  { keys: "I · O", action: "Mark in / out point", group: "Editing" },
  { keys: "Enter", action: "Create clip from marks", group: "Editing" },
  { keys: "N", action: "New clip at playhead", group: "Editing" },
  { keys: "D", action: "Duplicate selected clip", group: "Editing" },
  { keys: "Shift 1-9", action: "Jump to clip N", group: "Editing" },
  { keys: "Delete", action: "Delete selected clip", group: "Editing" },
  { keys: "M", action: "Toggle mute", group: "View" },
  { keys: "C", action: "Toggle captions", group: "View" },
  { keys: "+ / -", action: "Zoom timeline in / out", group: "View" },
  { keys: "1 2 3 4", action: "Switch right panel", group: "Navigation" },
  { keys: "?", action: "Show this overlay", group: "Navigation" },
  { keys: "Esc", action: "Close dialog", group: "Navigation" },
];

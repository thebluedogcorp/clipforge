"use client";

import { useEffect, useRef } from "react";
import { useClipper } from "@/lib/store";

/**
 * Watches the clips list and generates a poster thumbnail for each clip by
 * seeking the (hidden) video element to the clip's midpoint and drawing the
 * frame onto a canvas. Thumbnails are cached in the store.
 *
 * Uses a single offscreen video + canvas so we don't disturb the main player.
 */
export function useThumbnailGenerator() {
  const clips = useClipper((s) => s.clips);
  const source = useClipper((s) => s.source);
  const setThumbnail = useClipper((s) => s.setThumbnail);
  const thumbnails = useClipper((s) => s.thumbnails);

  // offscreen video + canvas refs (created lazily)
  const offVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!source || source.kind !== "file") return;
    if (!offVideoRef.current) {
      offVideoRef.current = document.createElement("video");
      offVideoRef.current.crossOrigin = "anonymous";
      offVideoRef.current.muted = true;
      offVideoRef.current.playsInline = true;
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = 160;
      canvasRef.current.height = 90;
    }
    offVideoRef.current.src = source.url;
  }, [source]);

  useEffect(() => {
    if (!source || source.kind !== "file") return;
    const v = offVideoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;

    let cancelled = false;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    async function gen(clipId: string, t: number) {
      if (cancelled) return;
      // skip if already cached
      if (useClipper.getState().thumbnails[clipId]) return;
      await new Promise<void>((res) => {
        const onSeeked = () => {
          v.removeEventListener("seeked", onSeeked);
          res();
        };
        v.addEventListener("seeked", onSeeked);
        v.currentTime = t;
      });
      if (cancelled) return;
      // keep 16:9
      const w = c.width;
      const h = c.height;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);
      const vw = v.videoWidth;
      const vh = v.videoHeight;
      if (vw && vh) {
        const scale = Math.max(w / vw, h / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      try {
        const url = c.toDataURL("image/jpeg", 0.6);
        if (!cancelled) setThumbnail(clipId, url);
      } catch {
        // tainted canvas — skip
      }
    }

    (async () => {
      for (const clip of clips) {
        if (cancelled) break;
        if (useClipper.getState().thumbnails[clip.id]) continue;
        const mid = (clip.start + clip.end) / 2;
        try {
          await gen(clip.id, Math.min(mid, (v.duration || clip.end) - 0.1));
        } catch {
          // ignore individual failures
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // regenerate when clip set or their start/end changes
  }, [clips, source, setThumbnail]);

  // expose the thumbnails for debugging
  void thumbnails;
}

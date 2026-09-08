"use client";

import { useEffect, useRef } from "react";
import { useClipper } from "@/lib/store";
import { persistence, type PersistedState } from "@/lib/persistence";
import type { VideoSource } from "@/lib/types";
import { toast } from "sonner";

/** Check available storage and warn if the blob would push us near quota. */
async function checkStorageQuota(blobSize: number): Promise<boolean> {
  if (navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const total = est.quota ?? 0;
      const used = est.usage ?? 0;
      const remaining = total - used;
      // warn if this blob would leave less than 15% free
      if (total > 0 && (blobSize > remaining || remaining - blobSize < total * 0.15)) {
        const mb = (n: number) => (n / 1024 / 1024).toFixed(0);
        toast.warning(
          `Storage almost full (${mb(used)}/${mb(total)} MB used). ` +
            `Clearing old data…`,
          { duration: 4000 }
        );
        // evict: clear the stored file blob (keep the state metadata)
        await persistence.setFile(new Blob([])).catch(() => {});
        return false;
      }
      if (total > 0 && blobSize > remaining * 0.8) {
        toast.warning(
          `This video (${mb(blobSize)} MB) is large — browser storage may run low.`,
          { duration: 5000 }
        );
      }
    } catch {
      // estimate() not available — proceed
    }
  }
  return true;
}

/**
 * Auto-saves the project state to IndexedDB (debounced) and restores it on
 * first mount. The video File blob is also stored so local-file sources can
 * be re-created after a reload. Includes storage quota management.
 */
export function usePersistence() {
  const hydrated = useRef(false);

  // restore on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await persistence.getState();
        if (cancelled || !saved) return;
        if (saved.source) {
          let url: string | null = null;
          if (saved.source.kind === "file" && saved.fileBlobKey) {
            const blob = await persistence.getFile(saved.fileBlobKey);
            if (blob && blob.size > 0) {
              url = URL.createObjectURL(blob);
            }
          } else if (saved.source.kind === "youtube") {
            url = saved.source.url;
            if (saved.source.youtubeId) {
              url = `https://www.youtube-nocookie.com/embed/${saved.source.youtubeId}?rel=0&modestbranding=1`;
            }
          }
          if (url) {
            const source: VideoSource = {
              ...saved.source,
              url,
            };
            useClipper.getState().setSource(source);
          }
        }
        useClipper.setState({
          clips: saved.clips,
          captions: saved.captions,
          transcript: saved.transcript,
          aspect: saved.aspect,
          captionStyle: saved.captionStyle,
          captionColor: saved.captionColor || "#ffffff",
          captionSize: saved.captionSize || 24,
          captionPosition: saved.captionPosition || 78,
        });
      } catch (err) {
        console.debug("[persistence] restore failed", err);
      } finally {
        hydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // debounced auto-save (2s after the last change)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const save = async () => {
      const s = useClipper.getState();
      if (!s.source) {
        await persistence.clear();
        return;
      }
      const { url: _url, ...sourceMeta } = s.source;
      void _url;
      const state: PersistedState = {
        clips: s.clips,
        captions: s.captions,
        transcript: s.transcript,
        source: sourceMeta,
        fileBlobKey: "file",
        aspect: s.aspect,
        captionStyle: s.captionStyle,
        captionColor: s.captionColor,
        captionSize: s.captionSize,
        captionPosition: s.captionPosition,
        savedAt: Date.now(),
      };
      try {
        await persistence.setState(state);
      } catch (err) {
        console.debug("[persistence] save failed", err);
      }
    };

    const unsub = useClipper.subscribe(() => {
      if (!hydrated.current) return;
      clearTimeout(timer);
      timer = setTimeout(save, 2000);
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  // store the file blob when a local source is set (with quota check)
  const source = useClipper((s) => s.source);
  useEffect(() => {
    if (!hydrated.current) return;
    if (source && source.kind === "file") {
      fetch(source.url)
        .then((r) => r.blob())
        .then(async (blob) => {
          await checkStorageQuota(blob.size);
          await persistence.setFile(blob);
        })
        .catch(() => {});
    }
  }, [source]);
}

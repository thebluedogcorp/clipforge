"use client";

import { useEffect, useRef } from "react";
import { useClipper } from "@/lib/store";
import { persistence, type PersistedState } from "@/lib/persistence";
import type { VideoSource } from "@/lib/types";

/**
 * Auto-saves the project state to IndexedDB (debounced) and restores it on
 * first mount. The video File blob is also stored so local-file sources can
 * be re-created after a reload.
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
        // restore source + blob if present
        if (saved.source) {
          let url: string | null = null;
          if (saved.source.kind === "file" && saved.fileBlobKey) {
            const blob = await persistence.getFile(saved.fileBlobKey);
            if (blob) {
              url = URL.createObjectURL(blob);
            }
          } else if (saved.source.kind === "youtube") {
            url = saved.source.url; // embed URL was stripped — reconstruct
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
        // restore the rest of the state
        useClipper.setState({
          clips: saved.clips,
          captions: saved.captions,
          transcript: saved.transcript,
          aspect: saved.aspect,
          captionStyle: saved.captionStyle,
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

  // store the file blob when a local source is set
  const source = useClipper((s) => s.source);
  useEffect(() => {
    if (!hydrated.current) return;
    if (source && source.kind === "file") {
      // fetch the blob from the object URL and store it
      fetch(source.url)
        .then((r) => r.blob())
        .then((blob) => persistence.setFile(blob))
        .catch(() => {});
    }
  }, [source]);
}

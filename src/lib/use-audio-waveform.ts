"use client";

import { useEffect } from "react";
import { useClipper } from "@/lib/store";

/**
 * Decodes the source video's audio track via the WebAudio API and computes a
 * downsampled peak envelope (one peak per ~10ms bucket). The result is stored
 * in the zustand store so the timeline can render the real waveform instead
 * of the procedural placeholder.
 *
 * Runs entirely in-browser — no upload. Audio is decoded with
 * `AudioContext.decodeAudioData`, then we walk the PCM buffer in fixed
 * buckets and take the max absolute amplitude per bucket.
 */
export function useAudioWaveform() {
  const source = useClipper((s) => s.source);
  const setWaveform = useClipper((s) => s.setWaveform);

  useEffect(() => {
    if (!source || source.kind !== "file") {
      setWaveform(null);
      return;
    }

    let cancelled = false;
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    (async () => {
      try {
        const res = await fetch(source.url);
        const arr = await res.arrayBuffer();
        const ctx = new AC();
        const audio = await ctx.decodeAudioData(arr.slice(0));
        ctx.close();
        if (cancelled) return;

        const ch = audio.getChannelData(0);
        const sampleRate = audio.sampleRate;
        const duration = audio.duration;
        // target ~ 1 peak per 8ms — fine enough to look detailed, small enough
        // to render fast even for long videos
        const bucketMs = 8;
        const bucketSize = Math.max(1, Math.floor((sampleRate * bucketMs) / 1000));
        const peakCount = Math.ceil(ch.length / bucketSize);
        const peaks = new Float32Array(peakCount);
        let maxPeak = 0.0001;
        for (let i = 0; i < peakCount; i++) {
          const start = i * bucketSize;
          const end = Math.min(start + bucketSize, ch.length);
          let peak = 0;
          for (let j = start; j < end; j++) {
            const v = Math.abs(ch[j]);
            if (v > peak) peak = v;
          }
          peaks[i] = peak;
          if (peak > maxPeak) maxPeak = peak;
        }
        // normalize to 0..1 and apply a mild gamma so quiet parts are visible
        const gamma = 0.7;
        const normalized = Array.from(peaks, (p) => {
          const n = p / maxPeak;
          return Math.pow(n, gamma);
        });
        if (!cancelled) {
          setWaveform({ peaks: normalized, duration });
        }
      } catch (err) {
        // decoding can fail for some containers (e.g. no audio track) —
        // silently fall back to the procedural waveform by setting null
        if (!cancelled) setWaveform(null);
        console.debug("[waveform] decode failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, setWaveform]);
}

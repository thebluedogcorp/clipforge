"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// Single-threaded core — works without SharedArrayBuffer, but we set COOP/COEP
// headers anyway in next.config.ts so the MT core would also work.
const CORE_VERSION = "0.12.6";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return Promise.resolve(ffmpeg);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const instance = new FFmpeg();
    instance.on("log", ({ message }) => {
      // surface ffmpeg logs to console for debugging
      if (process.env.NODE_ENV !== "production") {
        console.debug("[ffmpeg]", message);
      }
    });
    await instance.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = instance;
    return instance;
  })();

  return loadPromise;
}

export async function isFFmpegReady(): Promise<boolean> {
  try {
    await getFFmpeg();
    return true;
  } catch {
    return false;
  }
}

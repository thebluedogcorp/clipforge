/**
 * ClipForge Desktop Launcher + Self-Contained Server
 *
 * This file is compiled into a single executable via `bun build --compile`.
 * It does NOT require Node.js or any external runtime — the Bun runtime
 * embedded in the exe runs everything in-process.
 *
 * How it works:
 *   1. The exe serves static files (.next/static, public/) from disk
 *   2. The exe serves the pre-rendered HTML page directly
 *   3. API routes are handled in-process (transcribe, captions, youtube)
 *   4. The browser opens automatically to http://localhost:3000
 *
 * This avoids the "Cannot find package 'next'" issue because we don't
 * use Next.js's standalone server at all — we serve the built output
 * directly with Bun's built-in HTTP server.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname, extname, resolve } from "node:path";
import { exec } from "node:child_process";

// ── Configuration ─────────────────────────────────────────────────────────
const exeDir = (() => {
  const ep = process.execPath;
  if (!ep.includes("bun") && !ep.includes("node")) {
    return dirname(ep);
  }
  return process.cwd();
})();

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

// Paths to the built assets (alongside the exe)
const staticDir = resolve(exeDir, ".next", "static");
const publicDir = resolve(exeDir, "public");
const nextDir = resolve(exeDir, ".next");
const buildIdPath = resolve(nextDir, "BUILD_ID");

// ── Banner ────────────────────────────────────────────────────────────────
console.log("");
console.log("  ╔══════════════════════════════════════════╗");
console.log("  ║          ClipForge — Starting...         ║");
console.log("  ╠══════════════════════════════════════════╣");
console.log(`  ║  Server:  http://localhost:${PORT}          ║`);
console.log("  ║  Browser opening automatically...        ║");
console.log("  ║  Close this window to stop the server.   ║");
console.log("  ╚══════════════════════════════════════════╝");
console.log("");
console.log(`  App directory: ${exeDir}`);

// ── Verify assets exist ───────────────────────────────────────────────────
if (!existsSync(nextDir)) {
  console.error("  ✗ Application files not found!");
  console.error(`    Looked in: ${nextDir}`);
  console.error("    Please ensure all files are intact.");
  console.error("\n  Press Enter to exit...");
  process.stdin.resume();
  process.exit(1);
}

// Read the BUILD_ID
const BUILD_ID = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf-8").trim() : "unknown";

// Read the pre-rendered HTML page (the home page was statically generated)
let prerenderedHtml: string | null = null;
const htmlPath = resolve(nextDir, "server", "app", "index.html");
if (existsSync(htmlPath)) {
  prerenderedHtml = readFileSync(htmlPath, "utf-8");
} else {
  // Try the .next/server/app/ path
  const altHtmlPath = resolve(nextDir, "server", "app", "page.html");
  if (existsSync(altHtmlPath)) {
    prerenderedHtml = readFileSync(altHtmlPath, "utf-8");
  }
}

// ── MIME types ────────────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".map": "application/json",
  ".txt": "text/plain",
};

function getMime(path: string): string {
  return MIME[extname(path).toLowerCase()] || "application/octet-stream";
}

// ── HTTP Server ───────────────────────────────────────────────────────────
const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    // Parse URL manually — Bun's compiled binary may not have the global URL constructor
    const reqUrl = req.url;
    // reqUrl is like "http://localhost:3000/path?query=..."
    const pathEnd = reqUrl.indexOf("?");
    const pathWithHost = pathEnd >= 0 ? reqUrl.substring(0, pathEnd) : reqUrl;
    const pathStart = pathWithHost.indexOf("/", 8); // skip "http://"
    const path = pathStart >= 0 ? pathWithHost.substring(pathStart) : "/";
    const queryString = pathEnd >= 0 ? reqUrl.substring(pathEnd + 1) : "";
    const searchParams = new URLSearchParams(queryString);

    // ── CORS headers for SharedArrayBuffer (ffmpeg.wasm) ────────────────
    const corsHeaders = {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    };

    // ── API Routes ──────────────────────────────────────────────────────
    if (path.startsWith("/api/")) {
      try {
        // Dynamically import the API route handler
        // The API routes are compiled into the binary
        if (path === "/api/transcribe" && req.method === "POST") {
          const form = await req.formData();
          const file = form.get("audio") as File;
          if (!file) return new Response(JSON.stringify({ error: "No audio file" }), { status: 400, headers: { "Content-Type": "application/json" } });
          const buf = Buffer.from(await file.arrayBuffer());
          const base64 = buf.toString("base64");
          const ZAI = (await import("z-ai-web-dev-sdk")).default;
          const zai = await ZAI.create();
          const response = await zai.audio.asr.create({ file_base64: base64 });
          const text = (response?.text ?? "").trim();
          if (!text) return new Response(JSON.stringify({ error: "Empty transcription" }), { status: 422, headers: { "Content-Type": "application/json" } });
          return new Response(JSON.stringify({ text }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        if (path === "/api/captions" && req.method === "POST") {
          const body = await req.json();
          const ZAI = (await import("z-ai-web-dev-sdk")).default;
          const zai = await ZAI.create();
          const completion = await zai.chat.completions.create({
            messages: [
              { role: "system", content: `You are a professional subtitle editor. Split the transcript into short (3-7 word) timed caption segments covering the full duration (${body.duration}s). Return ONLY a JSON array: [{"start":number,"end":number,"text":"string"}].` },
              { role: "user", content: `Transcript: "${body.transcript}"\nReturn the JSON array now.` },
            ],
            temperature: 0.2,
          });
          const raw = completion.choices?.[0]?.message?.content ?? "";
          const match = raw.match(/\[[\s\S]*\]/);
          let segments: any[] = [];
          if (match) { try { segments = JSON.parse(match[0]); } catch {} }
          return new Response(JSON.stringify({ segments }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        if (path === "/api/youtube" && req.method === "GET") {
          const videoUrl = searchParams.get("url") || "";
          const id = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
          if (!id) return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), { status: 400, headers: { "Content-Type": "application/json" } });
          const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
          const res = await fetch(oembed);
          if (!res.ok) return new Response(JSON.stringify({ error: "Video not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
          const data = await res.json() as any;
          return new Response(JSON.stringify({
            id, title: data.title, author: data.author_name, thumbnail: data.thumbnail_url,
            embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
          }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        if (path === "/api/download" && req.method === "POST") {
          // Download a YouTube video using yt-dlp (if installed on the system)
          const body = await req.json();
          const dlUrl = body.url;
          if (!dlUrl) return new Response(JSON.stringify({ error: "Missing url" }), { status: 400, headers: { "Content-Type": "application/json" } });
          const id = dlUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
          if (!id) return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), { status: 400, headers: { "Content-Type": "application/json" } });

          // Use yt-dlp if available, otherwise return an error
          const { execSync } = await import("node:child_process");
          const { existsSync, mkdirSync, readFileSync, unlinkSync, statSync } = await import("node:fs");
          const { join } = await import("node:path");
          const { tmpdir } = await import("node:os");

          const dlDir = join(tmpdir(), "clipforge-downloads");
          if (!existsSync(dlDir)) mkdirSync(dlDir, { recursive: true });
          const outFile = join(dlDir, `${id}.mp4`);

          if (!existsSync(outFile)) {
            // Find yt-dlp
            let ytDlpPath = "";
            try {
              ytDlpPath = execSync(
                process.platform === "win32" ? "where yt-dlp" : "which yt-dlp",
                { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
              ).trim().split("\n")[0].trim();
            } catch {}

            if (!ytDlpPath) {
              return new Response(JSON.stringify({
                error: "yt-dlp not found. Install it from https://github.com/yt-dlp/yt-dlp"
              }), { status: 500, headers: { "Content-Type": "application/json" } });
            }

            // Download
            const { spawn } = await import("node:child_process");
            await new Promise<void>((resolve, reject) => {
              const proc = spawn(ytDlpPath, [
                "-f", "best[ext=mp4][height<=720]/best[height<=720]/best",
                "--merge-output-format", "mp4",
                "-o", outFile,
                "--no-playlist",
                "--no-warnings",
                dlUrl,
              ], { stdio: ["pipe", "pipe", "pipe"] });
              proc.on("close", (code) => {
                if (code === 0 && existsSync(outFile)) resolve();
                else reject(new Error(`yt-dlp exited with code ${code}`));
              });
              proc.on("error", reject);
            });
          }

          // Stream the file
          const stat = statSync(outFile);
          const fileData = readFileSync(outFile);
          // Clean up after reading
          try { unlinkSync(outFile); } catch {}
          return new Response(fileData, {
            status: 200,
            headers: {
              "Content-Type": "video/mp4",
              "Content-Length": stat.size.toString(),
              "Content-Disposition": `attachment; filename="${id}.mp4"`,
              ...corsHeaders,
            },
          });
        }
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || "API error" }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── Static file serving ─────────────────────────────────────────────
    // 1. Next.js static assets: /_next/static/...
    if (path.startsWith("/_next/static/")) {
      const filePath = resolve(staticDir, path.replace("/_next/static/", ""));
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        return new Response(readFileSync(filePath), {
          headers: { "Content-Type": getMime(filePath), "Cache-Control": "public, max-age=31536000, immutable", ...corsHeaders },
        });
      }
    }

    // 2. Public folder assets: /fonts/..., /logo.svg, etc.
    const publicFilePath = resolve(publicDir, path.replace(/^\//, ""));
    if (path !== "/" && existsSync(publicFilePath) && statSync(publicFilePath).isFile()) {
      return new Response(readFileSync(publicFilePath), {
        headers: { "Content-Type": getMime(publicFilePath), ...corsHeaders },
      });
    }

    // 3. Home page — serve pre-rendered HTML
    if (path === "/" || path === "") {
      if (prerenderedHtml) {
        return new Response(prerenderedHtml, {
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
        });
      }
      // Fallback: a minimal HTML that loads the page
      return new Response(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>ClipForge</title></head><body><script>window.location.href = "/_next/static/";</script></body></html>`, {
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
      });
    }

    // 4. 404
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain", ...corsHeaders } });
  },
});

console.log(`  ✓ Server ready at ${URL}`);
console.log(`  Build ID: ${BUILD_ID}`);

// ── Open browser ──────────────────────────────────────────────────────────
const openBrowser = () => {
  const cmd =
    process.platform === "win32" ? `start "" "${URL}"` :
    process.platform === "darwin" ? `open "${URL}"` :
    `xdg-open "${URL}"`;
  exec(cmd, (err) => {
    if (err) {
      console.log(`\n  ➜  Open manually: ${URL}\n`);
    } else {
      console.log(`\n  ➜  Opened ${URL} in your browser.\n`);
    }
  });
};

// Open the browser after a short delay
setTimeout(openBrowser, 1000);

// ── Shutdown ──────────────────────────────────────────────────────────────
process.on("SIGINT", () => {
  console.log("\n  Shutting down ClipForge...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});

console.log("\n  Press Ctrl+C to stop the server.\n");

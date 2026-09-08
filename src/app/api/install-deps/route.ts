import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, writeFileSync, chmodSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

export const runtime = "nodejs";
export const maxDuration = 600;

const BIN_DIR = join(process.cwd(), "bin");

/**
 * POST /api/install-deps
 * Body: { tool: "yt-dlp" | "ffmpeg" }
 *
 * Downloads yt-dlp or ffmpeg binary into ./bin/ so the app can use them
 * without requiring the user to install anything manually.
 */
export async function POST(req: NextRequest) {
  try {
    const { tool } = await req.json();
    if (!tool) {
      return NextResponse.json({ error: "Missing 'tool' parameter" }, { status: 400 });
    }

    if (!existsSync(BIN_DIR)) {
      mkdirSync(BIN_DIR, { recursive: true });
    }

    const platform = process.platform;
    const arch = process.arch;

    if (tool === "yt-dlp") {
      return await installYtDlp(platform, arch);
    } else if (tool === "ffmpeg") {
      return await installFfmpeg(platform, arch);
    } else {
      return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Install failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function installYtDlp(platform: string, arch: string): Promise<NextResponse> {
  // yt-dlp releases: https://github.com/yt-dlp/yt-dlp/releases
  let downloadUrl: string;
  let fileName: string;

  if (platform === "win32") {
    downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
    fileName = "yt-dlp.exe";
  } else if (platform === "darwin") {
    downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
    fileName = "yt-dlp";
  } else {
    // Linux
    downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
    fileName = "yt-dlp";
  }

  const outputPath = join(BIN_DIR, fileName);

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download yt-dlp: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    writeFileSync(outputPath, new Uint8Array(arrayBuffer));

    // Make executable on Unix
    if (platform !== "win32") {
      chmodSync(outputPath, 0o755);
    }

    return NextResponse.json({
      success: true,
      tool: "yt-dlp",
      path: outputPath,
      message: `yt-dlp installed to ${outputPath}`,
    });
  } catch (err) {
    return NextResponse.json({
      error: `Failed to install yt-dlp: ${err instanceof Error ? err.message : err}`,
    }, { status: 500 });
  }
}

async function installFfmpeg(platform: string, arch: string): Promise<NextResponse> {
  // ffmpeg static builds
  let downloadUrl: string;
  let fileName: string;
  let extractName: string | null = null;

  if (platform === "win32") {
    // Use gyan.dev essential build
    downloadUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";
    fileName = "ffmpeg.zip";
    extractName = "ffmpeg.exe";
  } else if (platform === "darwin") {
    // Use evermeet.cx
    downloadUrl = "https://evermeet.cx/ffmpeg/getrelease/zip";
    fileName = "ffmpeg.zip";
    extractName = "ffmpeg";
  } else {
    // Linux — use johnvansickle.com static build
    const archSuffix = arch === "arm64" ? "arm64" : "amd64";
    downloadUrl = `https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-${archSuffix}-static.tar.xz`;
    fileName = "ffmpeg.tar.xz";
    extractName = "ffmpeg";
  }

  const outputPath = join(BIN_DIR, fileName);
  const finalPath = join(BIN_DIR, platform === "win32" ? "ffmpeg.exe" : "ffmpeg");

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download ffmpeg: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    writeFileSync(outputPath, new Uint8Array(arrayBuffer));

    // For zip files, we'd need to extract — but Bun can't do zip natively.
    // For now, just store the archive and note that extraction is needed.
    // The frontend will show instructions.
    if (platform === "win32" || platform === "darwin") {
      // Try to extract using system unzip
      const { execSync } = await import("node:child_process");
      try {
        if (platform === "win32") {
          execSync(`powershell -Command "Expand-Archive -Path '${outputPath}' -DestinationPath '${BIN_DIR}' -Force"`, { stdio: "pipe" });
        } else {
          execSync(`unzip -o '${outputPath}' -d '${BIN_DIR}'`, { stdio: "pipe" });
        }
        // The extracted ffmpeg binary should be at BIN_DIR/ffmpeg or BIN_DIR/ffmpeg.exe
        const extractedPath = join(BIN_DIR, platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
        // Check common sub-paths
        const possiblePaths = [
          join(BIN_DIR, platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
          join(BIN_DIR, "bin", platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
        ];
        for (const p of possiblePaths) {
          if (existsSync(p)) {
            if (platform !== "win32") chmodSync(p, 0o755);
            return NextResponse.json({
              success: true,
              tool: "ffmpeg",
              path: p,
              message: `ffmpeg installed to ${p}`,
            });
          }
        }
      } catch (extractErr) {
        // Extraction failed — leave the archive and return instructions
      }
    }

    return NextResponse.json({
      success: true,
      tool: "ffmpeg",
      path: outputPath,
      message: `ffmpeg downloaded to ${outputPath}. You may need to extract it manually.`,
    });
  } catch (err) {
    return NextResponse.json({
      error: `Failed to install ffmpeg: ${err instanceof Error ? err.message : err}`,
    }, { status: 500 });
  }
}

/**
 * GET /api/install-deps?status=check
 * Returns installation status of yt-dlp and ffmpeg.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("status") === "check") {
    const ytDlpBundled = existsSync(join(BIN_DIR, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"));
    const ffmpegBundled = existsSync(join(BIN_DIR, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"));

    // Also check system PATH
    const { execSync } = await import("node:child_process");
    let ytDlpSystem = false;
    let ffmpegSystem = false;
    try {
      execSync(process.platform === "win32" ? "where yt-dlp" : "which yt-dlp", { stdio: ["pipe", "pipe", "ignore"] });
      ytDlpSystem = true;
    } catch {}
    try {
      execSync(process.platform === "win32" ? "where ffmpeg" : "which ffmpeg", { stdio: ["pipe", "pipe", "ignore"] });
      ffmpegSystem = true;
    } catch {}

    return NextResponse.json({
      ytDlp: { bundled: ytDlpBundled, system: ytDlpSystem, installed: ytDlpBundled || ytDlpSystem },
      ffmpeg: { bundled: ffmpegBundled, system: ffmpegSystem, installed: ffmpegBundled || ffmpegSystem },
    });
  }
  return NextResponse.json({ error: "Use POST to install or ?status=check" }, { status: 400 });
}

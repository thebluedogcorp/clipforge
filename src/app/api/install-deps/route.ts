import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, writeFileSync, chmodSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

export const runtime = "nodejs";
export const maxDuration = 600;

function getBinDir(): string {
  const binDir = join(process.cwd(), "bin");
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true });
  return binDir;
}

/**
 * POST /api/install-deps
 * Body: { tool: "yt-dlp" | "ffmpeg" }
 * Downloads the binary into ./bin/ so the app can use it.
 */
export async function POST(req: NextRequest) {
  try {
    const { tool } = await req.json();
    if (!tool) {
      return NextResponse.json({ error: "Missing 'tool' parameter" }, { status: 400 });
    }

    const binDir = getBinDir();
    const platform = process.platform;

    if (tool === "yt-dlp") {
      return await installYtDlp(binDir, platform);
    } else if (tool === "ffmpeg") {
      return await installFfmpeg(binDir, platform);
    } else {
      return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Install failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function installYtDlp(binDir: string, platform: string): Promise<NextResponse> {
  let downloadUrl: string;
  let fileName: string;

  if (platform === "win32") {
    downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
    fileName = "yt-dlp.exe";
  } else if (platform === "darwin") {
    downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
    fileName = "yt-dlp";
  } else {
    downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
    fileName = "yt-dlp";
  }

  const outputPath = join(binDir, fileName);

  try {
    const response = await fetch(downloadUrl, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) {
      throw new Error("Downloaded file too small — likely an error page");
    }

    writeFileSync(outputPath, new Uint8Array(arrayBuffer));

    if (platform !== "win32") {
      chmodSync(outputPath, 0o755);
    }

    // Verify it works
    try {
      const version = execSync(`"${outputPath}" --version`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
      return NextResponse.json({
        success: true,
        tool: "yt-dlp",
        path: outputPath,
        version,
        message: `yt-dlp ${version} installed`,
      });
    } catch {
      return NextResponse.json({
        success: true,
        tool: "yt-dlp",
        path: outputPath,
        message: `yt-dlp installed to ${outputPath} (version check skipped)`,
      });
    }
  } catch (err) {
    return NextResponse.json({
      error: `Failed to install yt-dlp: ${err instanceof Error ? err.message : err}`,
    }, { status: 500 });
  }
}

async function installFfmpeg(binDir: string, platform: string): Promise<NextResponse> {
  let downloadUrl: string;
  let archiveName: string;
  let binaryName: string;

  if (platform === "win32") {
    // gyan.dev essentials build (zip with ffmpeg.exe inside)
    downloadUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";
    archiveName = "ffmpeg.zip";
    binaryName = "ffmpeg.exe";
  } else if (platform === "darwin") {
    // evermeet.cx (zip with ffmpeg binary inside)
    downloadUrl = "https://evermeet.cx/ffmpeg/getrelease/zip";
    archiveName = "ffmpeg.zip";
    binaryName = "ffmpeg";
  } else {
    // Linux — BtbN GitHub builds (tar.xz)
    downloadUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz";
    archiveName = "ffmpeg.tar.xz";
    binaryName = "ffmpeg";
  }

  const archivePath = join(binDir, archiveName);
  const finalPath = join(binDir, binaryName);

  try {
    const response = await fetch(downloadUrl, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 10000) {
      throw new Error("Downloaded file too small — likely an error page");
    }

    writeFileSync(archivePath, new Uint8Array(arrayBuffer));

    // Extract the binary
    if (platform === "win32") {
      // Use PowerShell to extract just ffmpeg.exe from the zip
      try {
        execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${binDir}\\ffmpeg-temp' -Force"`, { stdio: "pipe" });
        // Find ffmpeg.exe in the extracted directory
        const { readdirSync, renameSync, existsSync: exists } = await import("node:fs");
        const tempDir = join(binDir, "ffmpeg-temp");
        function findFile(dir: string, name: string): string | null {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
              const found = findFile(fullPath, name);
              if (found) return found;
            } else if (entry.name === name) {
              return fullPath;
            }
          }
          return null;
        }
        const found = findFile(tempDir, "ffmpeg.exe");
        if (found) {
          renameSync(found, finalPath);
        }
        // Clean up temp
        try { execSync(`rmdir /s /q "${tempDir}"`, { stdio: "pipe" }); } catch {}
      } catch {
        // Extraction failed — leave instructions
      }
    } else if (platform === "darwin") {
      // unzip on macOS
      try {
        execSync(`unzip -o "${archivePath}" -d "${binDir}"`, { stdio: "pipe" });
        chmodSync(finalPath, 0o755);
      } catch {}
    } else {
      // Linux — tar.xz
      try {
        execSync(`tar -xf "${archivePath}" -C "${binDir}"`, { stdio: "pipe" });
        // The binary is in a subdirectory like ffmpeg-master-latest-linux64-gpl/bin/ffmpeg
        const { readdirSync, renameSync } = await import("node:fs");
        function findFile(dir: string, name: string): string | null {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
              const found = findFile(fullPath, name);
              if (found) return found;
            } else if (entry.name === name) {
              return fullPath;
            }
          }
          return null;
        }
        const found = findFile(binDir, "ffmpeg");
        if (found && found !== finalPath) {
          renameSync(found, finalPath);
        }
        chmodSync(finalPath, 0o755);
      } catch {}
    }

    // Clean up archive
    try { unlinkSync(archivePath); } catch {}

    // Verify
    if (existsSync(finalPath)) {
      try {
        const version = execSync(`"${finalPath}" -version`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).split("\n")[0].trim();
        return NextResponse.json({
          success: true,
          tool: "ffmpeg",
          path: finalPath,
          version,
          message: `ffmpeg installed: ${version}`,
        });
      } catch {
        return NextResponse.json({
          success: true,
          tool: "ffmpeg",
          path: finalPath,
          message: `ffmpeg installed to ${finalPath}`,
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: "ffmpeg downloaded but extraction failed. Please extract manually from: " + archivePath,
      }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({
      error: `Failed to install ffmpeg: ${err instanceof Error ? err.message : err}`,
    }, { status: 500 });
  }
}

/**
 * GET /api/install-deps?status=check
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("status") === "check") {
    const binDir = getBinDir();
    const ytDlpBundled = existsSync(join(binDir, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"));
    const ffmpegBundled = existsSync(join(binDir, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"));

    let ytDlpSystem = false;
    let ffmpegSystem = false;
    try { execSync(process.platform === "win32" ? "where yt-dlp" : "which yt-dlp", { stdio: ["pipe", "pipe", "ignore"] }); ytDlpSystem = true; } catch {}
    try { execSync(process.platform === "win32" ? "where ffmpeg" : "which ffmpeg", { stdio: ["pipe", "pipe", "ignore"] }); ffmpegSystem = true; } catch {}

    return NextResponse.json({
      ytDlp: { bundled: ytDlpBundled, system: ytDlpSystem, installed: ytDlpBundled || ytDlpSystem },
      ffmpeg: { bundled: ffmpegBundled, system: ffmpegSystem, installed: ffmpegBundled || ffmpegSystem },
    });
  }
  return NextResponse.json({ error: "Use POST to install or ?status=check" }, { status: 400 });
}

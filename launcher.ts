/**
 * ClipForge Desktop Launcher (entry point for `bun build --compile`)
 *
 * When compiled into an exe, this file:
 *   1. Detects if it's running as the launcher or in server mode
 *   2. In launcher mode: starts the server (via node/bun) + opens browser
 *   3. In server mode: runs the Next.js standalone server directly
 *   4. Stays alive until the user closes the window / Ctrl+C
 *
 * The trick: the compiled Bun binary CAN run arbitrary JS via
 * `bun --eval` or by spawning itself with BUN_DISPATCH_MODE. We use the
 * simpler approach of spawning `node` (which is commonly installed) and
 * fall back to instructions if node isn't found.
 *
 * For a truly zero-dependency exe, the standalone server's node_modules
 * would need to be bundleable — but Next.js's native deps (sharp, etc.)
 * make that impractical. The node fallback is robust and works everywhere.
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { exec, execSync, spawn } from "node:child_process";

const exeDir = dirname(process.execPath);
const PORT = 3000;
const URL = `http://localhost:${PORT}`;
const serverPath = join(exeDir, "server.js");

// Banner
console.log("");
console.log("  ╔══════════════════════════════════════════╗");
console.log("  ║          ClipForge — Starting...         ║");
console.log("  ╠══════════════════════════════════════════╣");
console.log(`  ║  Server:  http://localhost:${PORT}          ║`);
console.log("  ║  Browser opening automatically...        ║");
console.log("  ║  Close this window to stop the server.   ║");
console.log("  ╚══════════════════════════════════════════╝");
console.log("");

// Verify server.js exists
if (!existsSync(serverPath)) {
  console.error("  ✗ Server file not found: " + serverPath);
  console.error("    Exe directory: " + exeDir);
  console.error("    Please ensure all files in this folder are intact.");
  process.exit(1);
}

// Set env vars
process.env.PORT = String(PORT);
process.env.HOSTNAME = "0.0.0.0";
process.env.NODE_ENV = "production";

// Try to find a JS runtime to run the server.
// Priority: node (most compatible with Next.js standalone), then bun.
function findRuntime(): { cmd: string; args: string[] } | null {
  // Check for node
  try {
    const nodePath = execSync("which node 2>/dev/null || where node 2>nul", { encoding: "utf-8" }).trim().split("\n")[0];
    if (nodePath && existsSync(nodePath)) {
      return { cmd: nodePath, args: [serverPath] };
    }
  } catch {}
  // Check for bun
  try {
    const bunPath = execSync("which bun 2>/dev/null || where bun 2>nul", { encoding: "utf-8" }).trim().split("\n")[0];
    if (bunPath && existsSync(bunPath)) {
      return { cmd: bunPath, args: [serverPath] };
    }
  } catch {}
  return null;
}

const runtime = findRuntime();
if (!runtime) {
  console.error("  ✗ No JavaScript runtime found (node or bun).");
  console.error("    Please install Node.js from https://nodejs.org");
  console.error("    Then run ClipForge again.");
  process.exit(1);
}

console.log(`  ✓ Using runtime: ${runtime.cmd}`);

// Start the server as a child process
const server = spawn(runtime.cmd, runtime.args, {
  env: { ...process.env, PORT: String(PORT), HOSTNAME: "0.0.0.0", NODE_ENV: "production" },
  stdio: "inherit",
  cwd: exeDir,
});

server.on("error", (err) => {
  console.error("  ✗ Server failed to start:", err.message);
  process.exit(1);
});

// Open the browser after the server has a moment to bind
let opened = false;
const openBrowser = () => {
  if (opened) return;
  opened = true;
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

setTimeout(openBrowser, 2500);

// Shutdown handling
process.on("SIGINT", () => {
  console.log("\n  Shutting down ClipForge...");
  server.kill("SIGTERM");
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.kill("SIGTERM");
  process.exit(0);
});

server.on("exit", (code) => {
  process.exit(code ?? 0);
});

/**
 * ClipForge Desktop Launcher
 *
 * Starts the Next.js standalone server and opens the default browser.
 * This file is compiled into a single executable via `bun build --compile`.
 *
 * When compiled, the exe sits alongside the standalone server files.
 * Running it starts the server on localhost:3000 and opens the browser.
 * Close the terminal window (or press Ctrl+C) to stop the server.
 */

import { spawn, exec } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// The standalone server.js sits alongside this binary in the distribution.
const serverPath = join(__dirname, "server.js");

if (!existsSync(serverPath)) {
  console.error("╔══════════════════════════════════════════╗");
  console.error("║  ClipForge — Error                        ║");
  console.error("╠══════════════════════════════════════════╣");
  console.error("║  Server files not found.                  ║");
  console.error("║  Please ensure all files in the folder    ║");
  console.error("║  are intact and try again.                ║");
  console.error("╚══════════════════════════════════════════╝");
  process.exit(1);
}

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

console.log("");
console.log("  ╔══════════════════════════════════════════╗");
console.log("  ║          ClipForge — Starting...         ║");
console.log("  ╠══════════════════════════════════════════╣");
console.log(`  ║  Server:  http://localhost:${PORT}          ║`);
console.log("  ║  Browser opening automatically...        ║");
console.log("  ║  Close this window to stop the server.   ║");
console.log("  ╚══════════════════════════════════════════╝");
console.log("");

// Start the Next.js standalone server
const server = spawn(process.execPath, [serverPath], {
  env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", HOSTNAME: "0.0.0.0" },
  stdio: "inherit",
});

// Wait for the server to start, then open the browser
let opened = false;
const openBrowser = () => {
  if (opened) return;
  opened = true;
  const openCmd =
    process.platform === "win32" ? "start" :
    process.platform === "darwin" ? "open" :
    "xdg-open";
  exec(`${openCmd} ${URL}`, (err) => {
    if (err) {
      console.log(`\n  ➜  Open manually: ${URL}\n`);
    } else {
      console.log(`\n  ➜  Opened ${URL} in your browser.\n`);
    }
  });
};

// Try opening after a delay
setTimeout(openBrowser, 2000);

// Keep the process alive and handle shutdown
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

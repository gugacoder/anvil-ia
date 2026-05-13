// Shared helpers for the session-end, pre-compact, session-start, and pre-tool-use hooks.
// Uses only the Node standard library so hook startup stays light.
//
// Transcript reading lives in `_transcript.js` (per-runtime). This file is
// runtime-agnostic: paths, logging, stdin parsing, runtime detection.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SLUG = "memory";

export function resolvePaths(metaUrl) {
  const file = fileURLToPath(metaUrl);
  // <workspace>/.systems/memory/scripts/hooks/<file>.js
  const systemDir = path.resolve(path.dirname(file), "..", "..");   // .systems/memory/
  const agentRoot = path.resolve(systemDir, "..", "..");            // workspace/
  return { SYSTEM_DIR: systemDir, AGENT_ROOT: agentRoot };
}

export function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function systemDayDir(agentRoot, dateStr) {
  return path.join(agentRoot, "mind", "calendar", "system", dateStr || todayStr());
}

export function configureLogging(agentRoot, sourceLabel) {
  const dayDir = systemDayDir(agentRoot);
  fs.mkdirSync(dayDir, { recursive: true });
  const logPath = path.join(dayDir, `log-${SLUG}.md`);

  const write = (level, message) => {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    fs.appendFileSync(
      logPath,
      `${ts} ${level} [${sourceLabel}] ${message}\n`,
      "utf-8",
    );
  };

  return {
    info: (msg) => write("INFO", msg),
    error: (msg) => write("ERROR", msg),
    path: logPath,
  };
}

export function readHookStdin() {
  // Claude Code on Windows may pass paths with unescaped backslashes,
  // which breaks JSON parsing; the fallback below doubles any lone
  // backslash so the JSON parse succeeds.
  const raw = fs.readFileSync(0, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    const fixed = raw.replace(/(?<!\\)\\(?!["\\])/g, "\\\\");
    return JSON.parse(fixed);
  }
}

// Detects the host CLI at runtime. DeepSeek-TUI exports DEEPSEEK_SESSION_ID
// (and other DEEPSEEK_* vars) into the hook environment; Claude Code does not
// export anything distinctive but always pipes a JSON payload to stdin.
// Returns "deepseek" | "claude" | "unknown".
export function detectRuntime() {
  if (process.env.DEEPSEEK_SESSION_ID || process.env.DEEPSEEK_WORKSPACE) {
    return "deepseek";
  }
  // Claude Code is the historical default. Any time we can't see DeepSeek
  // markers, treat the runtime as Claude — its hooks rely on stdin JSON,
  // and the callers all guard against missing/empty stdin themselves.
  return "claude";
}

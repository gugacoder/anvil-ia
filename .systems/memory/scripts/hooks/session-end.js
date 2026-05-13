// SessionEnd hook — captures the conversation transcript for memory extraction.
//
// Multi-runtime: works under Claude Code (stdin JSON with transcript_path) and
// DeepSeek-TUI (env DEEPSEEK_SESSION_ID; rollout looked up via session_index.jsonl).
//
// The hook itself does NO API calls — only local file I/O for speed.

// Recursion guard: if we were spawned by flush.js (which runs Claude Code, which
// would fire this hook again), exit immediately.
if (process.env.CLAUDE_INVOKED_BY) process.exit(0);

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import {
  SLUG,
  configureLogging,
  detectRuntime,
  readHookStdin,
  resolvePaths,
  systemDayDir,
} from "./_common.js";
import { readClaudeTranscript, readDeepSeekTranscript } from "./_transcript.js";

const { SYSTEM_DIR, AGENT_ROOT } = resolvePaths(import.meta.url);
const MIN_TURNS_TO_FLUSH = 1;

function gatherClaude(log) {
  let hookInput;
  try {
    hookInput = readHookStdin();
  } catch (e) {
    log.error(`Failed to parse stdin: ${e?.message || e}`);
    return null;
  }

  const sessionId = hookInput.session_id || "unknown";
  const source = hookInput.source || "unknown";
  const transcriptPathStr = hookInput.transcript_path || "";

  log.info(`SessionEnd fired [claude]: session=${sessionId} source=${source}`);

  if (!transcriptPathStr || typeof transcriptPathStr !== "string") {
    log.info("SKIP: no transcript path");
    return null;
  }

  try {
    const { context, turnCount } = readClaudeTranscript(transcriptPathStr);
    return { sessionId, context, turnCount };
  } catch (e) {
    if (e?.code === "ENOENT") {
      log.info(`SKIP: transcript missing: ${transcriptPathStr}`);
      return null;
    }
    log.error(`Context extraction failed: ${e?.message || e}`);
    return null;
  }
}

function gatherDeepSeek(log) {
  const sessionId = process.env.DEEPSEEK_SESSION_ID || "unknown";
  log.info(`SessionEnd fired [deepseek]: session=${sessionId}`);

  try {
    const { context, turnCount, reason, rolloutPath } = readDeepSeekTranscript(sessionId);
    if (reason) {
      log.info(`SKIP: ${reason}`);
      return null;
    }
    if (rolloutPath) log.info(`Rollout: ${rolloutPath}`);
    return { sessionId, context, turnCount };
  } catch (e) {
    log.error(`Context extraction failed: ${e?.message || e}`);
    return null;
  }
}

function main() {
  const log = configureLogging(AGENT_ROOT, "hook");
  const runtime = detectRuntime();

  const gathered = runtime === "deepseek" ? gatherDeepSeek(log) : gatherClaude(log);
  if (!gathered) return;

  const { sessionId, context, turnCount } = gathered;

  if (!context.trim()) {
    log.info("SKIP: empty context");
    return;
  }

  if (turnCount < MIN_TURNS_TO_FLUSH) {
    log.info(`SKIP: only ${turnCount} turns (min ${MIN_TURNS_TO_FLUSH})`);
    return;
  }

  const dayDir = systemDayDir(AGENT_ROOT);
  fs.mkdirSync(dayDir, { recursive: true });
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const contextFile = path.join(dayDir, `session-flush-${SLUG}-${sessionId}-${timestamp}.md`);
  fs.writeFileSync(contextFile, context, "utf-8");

  const flushScript = path.join(SYSTEM_DIR, "scripts", "mind", "flush.js");

  try {
    const child = spawn("node", [flushScript, contextFile, sessionId], {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    });
    child.unref();
    log.info(
      `Spawned flush.js for session ${sessionId} (${turnCount} turns, ${context.length} chars) [${runtime}]`,
    );
  } catch (e) {
    log.error(`Failed to spawn flush.js: ${e?.message || e}`);
  }
}

main();

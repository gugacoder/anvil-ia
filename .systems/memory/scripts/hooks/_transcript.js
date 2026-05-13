// Transcript readers — extract conversation context from each CLI's transcript format.
//
// Two runtimes:
// - Claude Code: hook stdin carries `transcript_path` to a JSONL file with
//   `{ message: { role, content } }` entries. Harness noise must be filtered.
// - DeepSeek-TUI: hook env carries `DEEPSEEK_SESSION_ID`. The rollout file path
//   is looked up in `~/.deepseek/session_index.jsonl` (one JSON entry per line,
//   `{ thread_id, rollout_path, ... }`). Latest entry for the id wins.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HARNESS_NOISE_PREFIXES = [
  "<local-command-",
  "<command-name>",
  "<command-message>",
  "<command-args>",
  "<command-stdout>",
  "<command-stderr>",
];

function isHarnessNoise(text) {
  const stripped = text.replace(/^\s+/, "");
  return HARNESS_NOISE_PREFIXES.some((p) => stripped.startsWith(p));
}

function trimToTail(turns, maxTurns, maxChars) {
  const recent = turns.slice(-maxTurns);
  let context = recent.join("\n");
  if (context.length > maxChars) {
    context = context.slice(context.length - maxChars);
    const boundary = context.indexOf("\n**");
    if (boundary > 0) context = context.slice(boundary + 1);
  }
  return { context, turnCount: recent.length };
}

export function readClaudeTranscript(transcriptPath, { maxTurns = 30, maxChars = 15_000 } = {}) {
  const raw = fs.readFileSync(transcriptPath, "utf-8");
  const turns = [];

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    let role;
    let content;
    const msg = entry.message;
    if (msg && typeof msg === "object") {
      role = msg.role || "";
      content = msg.content ?? "";
    } else {
      role = entry.role || "";
      content = entry.content ?? "";
    }

    if (role !== "user" && role !== "assistant") continue;

    if (Array.isArray(content)) {
      const textParts = [];
      for (const block of content) {
        if (block && typeof block === "object" && block.type === "text") {
          textParts.push(block.text || "");
        } else if (typeof block === "string") {
          textParts.push(block);
        }
      }
      content = textParts.join("\n");
    }

    if (typeof content !== "string") continue;

    content = content.trim();
    if (!content || isHarnessNoise(content)) continue;

    const label = role === "user" ? "User" : "Assistant";
    turns.push(`**${label}:** ${content}\n`);
  }

  return trimToTail(turns, maxTurns, maxChars);
}

function deepseekIndexPath() {
  return path.join(os.homedir(), ".deepseek", "session_index.jsonl");
}

// Walks session_index.jsonl, picks the LAST entry whose thread_id matches.
// Returns the rollout_path string, or null if not found / null.
function resolveDeepSeekRolloutPath(sessionId) {
  const indexPath = deepseekIndexPath();
  if (!fs.existsSync(indexPath)) return null;

  const raw = fs.readFileSync(indexPath, "utf-8");
  let match = null;
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry?.thread_id === sessionId && entry?.rollout_path) {
      match = entry.rollout_path;
    }
  }
  return match;
}

// DeepSeek rollout files are JSONL of conversation events. Schema isn't
// guaranteed stable upstream (the field is marked optional / future-extensibility
// in crates/state), so we accept several shapes and skip unrecognized lines.
export function readDeepSeekTranscript(sessionId, { maxTurns = 30, maxChars = 15_000 } = {}) {
  if (!sessionId) return { context: "", turnCount: 0, reason: "no session id" };

  const rolloutPath = resolveDeepSeekRolloutPath(sessionId);
  if (!rolloutPath) {
    return { context: "", turnCount: 0, reason: "rollout_path missing in session_index.jsonl" };
  }
  if (!fs.existsSync(rolloutPath)) {
    return { context: "", turnCount: 0, reason: `rollout file not found: ${rolloutPath}` };
  }

  const raw = fs.readFileSync(rolloutPath, "utf-8");
  const turns = [];

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Try a few shapes — the rollout schema isn't fully nailed down upstream.
    let role = entry.role;
    let content = entry.content;
    if (!role && entry.message && typeof entry.message === "object") {
      role = entry.message.role;
      content = entry.message.content;
    }
    if (!role && entry.kind === "user_message") {
      role = "user";
      content = entry.text ?? entry.content ?? "";
    }
    if (!role && entry.kind === "assistant_message") {
      role = "assistant";
      content = entry.text ?? entry.content ?? "";
    }

    if (role !== "user" && role !== "assistant") continue;

    if (Array.isArray(content)) {
      const textParts = [];
      for (const block of content) {
        if (block && typeof block === "object" && typeof block.text === "string") {
          textParts.push(block.text);
        } else if (typeof block === "string") {
          textParts.push(block);
        }
      }
      content = textParts.join("\n");
    }

    if (typeof content !== "string") continue;
    content = content.trim();
    if (!content) continue;

    const label = role === "user" ? "User" : "Assistant";
    turns.push(`**${label}:** ${content}\n`);
  }

  const result = trimToTail(turns, maxTurns, maxChars);
  return { ...result, rolloutPath };
}

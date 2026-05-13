// PreToolUse hook — guardrail for writes under mind/x/.
//
// Blocks Write/Edit tool calls that would create files in invalid locations
// inside mind/x/. The contract (mind/ABOUT.md, section 4 and invariant 13)
// restricts direct children of mind/x/ to files/, work/, and recognized
// system names. Subfolders of mind/x/work/ must correspond to an effort.

import fs from "node:fs";
import path from "node:path";

import { configureLogging, readHookStdin, resolvePaths } from "./_common.js";

const { AGENT_ROOT } = resolvePaths(import.meta.url);
const log = configureLogging(AGENT_ROOT, "pre-tool-use");

const X_DIR = path.join(AGENT_ROOT, "mind", "x");
const WORK_DIR = path.join(X_DIR, "work");
const EFFORT_DIR = path.join(AGENT_ROOT, "mind", "effort");
const SYSTEMS_DIR = path.join(AGENT_ROOT, ".systems");

const GUARDED_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

function listEffortSlugs() {
  const slugs = new Set();
  for (const sub of ["on", "slow", "off"]) {
    const dir = path.join(EFFORT_DIR, sub);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) slugs.add(entry.name);
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        slugs.add(entry.name.replace(/\.md$/, ""));
      }
    }
  }
  return slugs;
}

function listRecognizedSystems() {
  if (!fs.existsSync(SYSTEMS_DIR)) return new Set();
  const names = new Set();
  for (const entry of fs.readdirSync(SYSTEMS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "node_modules") continue;
    if (entry.name.startsWith(".")) continue;
    names.add(entry.name);
  }
  return names;
}

function normalizePath(p) {
  if (!p) return null;
  return path.resolve(p);
}

function relUnder(child, parent) {
  const rel = path.relative(parent, child);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.replace(/\\/g, "/");
}

function validatePath(absPath) {
  const relX = relUnder(absPath, X_DIR);
  if (relX === null) return { ok: true };

  const segments = relX.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { ok: false, reason: "Cannot write directly to mind/x/." };
  }

  const top = segments[0];
  const allowedSystems = listRecognizedSystems();
  const allowedTop = new Set(["files", "work", ...allowedSystems]);

  if (!allowedTop.has(top)) {
    const isLooseFile = segments.length === 1;
    const headline = isLooseFile
      ? `Cannot write loose file "${top}" directly under mind/x/.`
      : `mind/x/${top}/ is not a permitted subfolder of mind/x/.`;
    return {
      ok: false,
      reason:
        `${headline} Valid destinations under mind/x/ are:\n` +
        `  - files/  (binaries from inbox, referenced from concept articles)\n` +
        `  - work/<effort-slug>/  (artifacts paired with an effort)\n` +
        `  - <system>/  (recognized: ${[...allowedSystems].sort().join(", ") || "(none)"})\n` +
        `See mind/ABOUT.md section 4 (mind/x/) and invariant 13.`,
    };
  }

  if (top === "work") {
    if (segments.length < 2) {
      return {
        ok: false,
        reason:
          `Cannot write directly to mind/x/work/. Files must live inside an effort-paired subfolder, e.g. mind/x/work/<effort-slug>/...`,
      };
    }
    const slug = segments[1];
    const efforts = listEffortSlugs();
    if (!efforts.has(slug)) {
      return {
        ok: false,
        reason:
          `mind/x/work/${slug}/ has no matching effort. The slug must correspond to an effort in effort/on/, effort/slow/, or effort/off/. ` +
          `Either create the effort first, or fix the slug.`,
      };
    }
  }

  return { ok: true };
}

function extractFilePath(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null;
  if (toolName === "NotebookEdit") return toolInput.notebook_path || null;
  return toolInput.file_path || null;
}

async function main() {
  let payload;
  try {
    payload = readHookStdin();
  } catch (e) {
    log.error(`Failed to read hook input: ${e?.message || e}`);
    process.exit(0);
  }

  const toolName = payload.tool_name || "";
  if (!GUARDED_TOOLS.has(toolName)) {
    process.exit(0);
  }

  const filePath = extractFilePath(toolName, payload.tool_input);
  if (!filePath) {
    process.exit(0);
  }

  const absPath = normalizePath(filePath);
  if (!absPath) process.exit(0);

  const result = validatePath(absPath);
  if (result.ok) {
    process.exit(0);
  }

  log.info(`Blocked ${toolName} on ${filePath}: ${result.reason.split("\n")[0]}`);
  process.stderr.write(
    `[mind/x guardrail] ${result.reason}\n\nAttempted path: ${filePath}\n`,
  );
  process.exit(2);
}

main().catch((e) => {
  // Never break tool flow on guardrail bugs — fail open and log.
  try {
    log.error(`Guardrail crashed: ${e?.message || e}`);
  } catch {}
  process.exit(0);
});

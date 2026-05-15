#!/usr/bin/env node

/**
 * platform.mjs — Wrapper do docker compose pra operar a plataforma em dev.
 *
 * Carrega .env + docker-compose.platform.yml + docker-compose.platform.dev-ports.yml
 * e delega pro `docker compose` binario.
 *
 * Uso (via npm scripts):
 *   node infra/scripts/platform.mjs up -d
 *   node infra/scripts/platform.mjs down
 *   node infra/scripts/platform.mjs ps
 *   node infra/scripts/platform.mjs logs -f
 *
 * NAO e usado em staging/prod — la usa `docker compose -f docker-compose.yml ...`
 * diretamente (via `docker:*` scripts).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "../..");
const ENV_FILE = resolve(ROOT, ".env");

function loadDotenv(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  const lines = readFileSync(filePath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const dotenv = loadDotenv(ENV_FILE);
const finalEnv = { ...process.env, ...dotenv };

const args = process.argv.slice(2);
const isUp = args[0] === "up";
const composeArgs = [
  "compose",
  "-f", "infra/docker-compose.platform.yml",
  "-f", "infra/docker-compose.platform.dev-ports.yml",
  ...args,
  ...(isUp ? ["--remove-orphans"] : []),
];

const result = spawnSync("docker", composeArgs, {
  cwd: ROOT,
  env: finalEnv,
  stdio: "inherit",
});

process.exit(result.status ?? 1);

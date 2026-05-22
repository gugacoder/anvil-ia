// Arquivos: lista pasta storage/files/ (real)
import { Hono } from "hono";
import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../lib/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(PROJECT_ROOT, process.env.STORAGE_DIR)
  : path.resolve(PROJECT_ROOT, "storage");
const FILES_DIR = path.join(STORAGE_DIR, "files");

function safePath(p: string): string | null {
  const resolved = path.resolve(FILES_DIR, p);
  if (!resolved.startsWith(FILES_DIR)) return null;
  return resolved;
}

export const filesRoutes = new Hono();
filesRoutes.use("*", requireAuth);

filesRoutes.get("/", async (c) => {
  const rel = c.req.query("path") ?? "";
  const abs = safePath(rel);
  if (!abs) return c.json({ error: "invalid_path" }, 400);
  try {
    const entries = await readdir(abs, { withFileTypes: true });
    const items = await Promise.all(
      entries.map(async (e) => {
        const full = path.join(abs, e.name);
        const st = await stat(full);
        return {
          name: e.name,
          dir: e.isDirectory(),
          size: e.isDirectory() ? 0 : st.size,
          modifiedAt: st.mtime.toISOString(),
        };
      }),
    );
    items.sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name));
    return c.json({ path: rel, items });
  } catch (err) {
    return c.json({ error: "read_failed", message: (err as Error).message }, 500);
  }
});

filesRoutes.get("/content", async (c) => {
  const rel = c.req.query("path") ?? "";
  const abs = safePath(rel);
  if (!abs) return c.json({ error: "invalid_path" }, 400);
  try {
    const st = await stat(abs);
    if (st.isDirectory() || st.size > 256 * 1024) {
      return c.json({ error: "not_readable" }, 400);
    }
    const text = await readFile(abs, "utf-8");
    return c.json({ path: rel, text });
  } catch {
    return c.json({ error: "not_found" }, 404);
  }
});

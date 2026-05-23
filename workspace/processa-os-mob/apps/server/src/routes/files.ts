// Arquivos: lista pasta storage/files/ (real).
// Garante que a pasta exista no boot e semeia um arquivo de boas-vindas
// quando vazia. ENOENT em scandir vira items:[] em vez de 500/read_failed.
import { Hono } from "hono";
import { readdir, stat, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../lib/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(PROJECT_ROOT, process.env.STORAGE_DIR)
  : path.resolve(PROJECT_ROOT, "storage");
const FILES_DIR = path.join(STORAGE_DIR, "files");

const WELCOME_FILENAME = "bem-vindo.txt";
const WELCOME_BODY = `Bem-vindo aos Arquivos.

Esta eh sua pasta pessoal de arquivos do Processa OS.
Adicione arquivos diretamente em storage/files/ no servidor — eles aparecem aqui.

Voce pode apagar este arquivo a qualquer momento.
`;

let bootstrapped = false;
async function ensureFilesDir(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  try {
    await mkdir(FILES_DIR, { recursive: true });
    const entries = await readdir(FILES_DIR);
    if (entries.length === 0) {
      await writeFile(path.join(FILES_DIR, WELCOME_FILENAME), WELCOME_BODY, "utf-8");
    }
  } catch {
    // best-effort; nao bloqueia boot
  }
}

function safePath(p: string): string | null {
  const resolved = path.resolve(FILES_DIR, p);
  if (!resolved.startsWith(FILES_DIR)) return null;
  return resolved;
}

export const filesRoutes = new Hono();
filesRoutes.use("*", requireAuth);

filesRoutes.get("/", async (c) => {
  await ensureFilesDir();
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
    const code = (err as NodeJS.ErrnoException).code;
    // Pasta nao existe -> trata como vazia (UX > erro tecnico)
    if (code === "ENOENT") return c.json({ path: rel, items: [] });
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

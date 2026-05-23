// Notas: CRUD persistido em JSON por usuario, em storage/data/notes-<sub>.json
import { Hono } from "hono";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { requireAuth, getUser } from "../lib/auth.js";
import { bus } from "./notifications.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(PROJECT_ROOT, process.env.STORAGE_DIR)
  : path.resolve(PROJECT_ROOT, "storage");
const DATA_DIR = path.join(STORAGE_DIR, "data");

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

async function notesFile(sub: string) {
  await mkdir(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, `notes-${sub.replace(/[^a-z0-9_-]/gi, "_")}.json`);
}

function welcomeNote(): Note {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: "Bem-vindo às Notas",
    body: `Olá! Esta é sua área de notas.

• Toque no botão + para criar uma nova nota
• Toque em qualquer nota para editar
• Suas notas ficam salvas automaticamente

Pode apagar esta a qualquer momento.`,
    createdAt: now,
    updatedAt: now,
  };
}

async function load(sub: string): Promise<Note[]> {
  const file = await notesFile(sub);
  try {
    const raw = await readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    // Primeira leitura sem arquivo: semeia nota de boas-vindas e persiste.
    const seed = [welcomeNote()];
    await save(sub, seed);
    return seed;
  }
}

async function save(sub: string, notes: Note[]): Promise<void> {
  const file = await notesFile(sub);
  await writeFile(file, JSON.stringify(notes, null, 2), "utf-8");
}

export const notesRoutes = new Hono();

notesRoutes.use("*", requireAuth);

notesRoutes.get("/", async (c) => {
  const u = (await getUser(c))!;
  const notes = await load(u.sub);
  notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return c.json({ notes });
});

notesRoutes.post("/", async (c) => {
  const u = (await getUser(c))!;
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
  };
  const now = new Date().toISOString();
  const note: Note = {
    id: randomUUID(),
    title: (body.title ?? "Sem titulo").slice(0, 200),
    body: body.body ?? "",
    createdAt: now,
    updatedAt: now,
  };
  const notes = await load(u.sub);
  notes.push(note);
  await save(u.sub, notes);
  bus.emit({ kind: "note", title: "Nota criada", body: note.title });
  return c.json({ note });
});

notesRoutes.patch("/:id", async (c) => {
  const u = (await getUser(c))!;
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as Partial<Note>;
  const notes = await load(u.sub);
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return c.json({ error: "not_found" }, 404);
  const updated: Note = {
    ...notes[idx],
    ...(typeof body.title === "string" ? { title: body.title } : {}),
    ...(typeof body.body === "string" ? { body: body.body } : {}),
    updatedAt: new Date().toISOString(),
  };
  notes[idx] = updated;
  await save(u.sub, notes);
  return c.json({ note: updated });
});

notesRoutes.delete("/:id", async (c) => {
  const u = (await getUser(c))!;
  const id = c.req.param("id");
  const notes = await load(u.sub);
  const next = notes.filter((n) => n.id !== id);
  if (next.length === notes.length) return c.json({ error: "not_found" }, 404);
  await save(u.sub, next);
  return c.json({ ok: true });
});

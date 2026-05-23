// =============================================================================
// Cliente HTTP. Toda response passa por schema (zod) antes de virar tipo.
// Endpoints sob /so/api/v1, credenciais incluídas.
// =============================================================================

import { z } from "zod";
import {
  MeResponseSchema,
  LoginResponseSchema,
  NotesListResponseSchema,
  NoteResponseSchema,
  OkResponseSchema,
  FilesListResponseSchema,
  FileContentResponseSchema,
  NotificationsRecentResponseSchema,
  safeParseWithWarn,
} from "./schemas";

const BASE = "/so/api/v1";

const ErrorBodySchema = z.object({ error: z.string() }).partial();

async function jsonFetch<S extends z.ZodType>(
  schema: S,
  context: string,
  path: string,
  init?: RequestInit,
): Promise<z.infer<S>> {
  const r = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!r.ok) {
    const rawErr = await r.json().catch(() => null);
    const errParsed = ErrorBodySchema.safeParse(rawErr);
    const msg = errParsed.success && errParsed.data.error ? errParsed.data.error : `HTTP ${r.status}`;
    throw new Error(msg);
  }
  const raw = await r.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.warn(`[api:${context}] resposta invalida`, {
      error: parsed.error.issues,
      path,
      rawSample: JSON.stringify(raw).slice(0, 200),
    });
    throw new Error(`Resposta invalida de ${path}`);
  }
  return parsed.data;
}

// Re-export dos tipos a partir do schema central pra manter compat
export type { User, NoteDto, FileItem, NotifDto } from "./schemas";

export const api = {
  endpoint: BASE,

  async me() {
    const r = await jsonFetch(MeResponseSchema, "me", "/me");
    return r.user;
  },

  async login(username: string, password: string) {
    const r = await jsonFetch(LoginResponseSchema, "login", "/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return r.user;
  },

  async logout(): Promise<void> {
    await jsonFetch(OkResponseSchema, "logout", "/auth/logout", { method: "POST" });
  },

  notes: {
    async list() {
      const r = await jsonFetch(NotesListResponseSchema, "notes.list", "/notes");
      return r.notes;
    },
    async create(title: string, body: string) {
      const r = await jsonFetch(NoteResponseSchema, "notes.create", "/notes", {
        method: "POST",
        body: JSON.stringify({ title, body }),
      });
      return r.note;
    },
    async update(id: string, patch: { title?: string; body?: string }) {
      const r = await jsonFetch(NoteResponseSchema, "notes.update", `/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      return r.note;
    },
    async remove(id: string) {
      return jsonFetch(OkResponseSchema, "notes.remove", `/notes/${id}`, { method: "DELETE" });
    },
  },

  files: {
    list: (p = "") =>
      jsonFetch(FilesListResponseSchema, "files.list", `/files?path=${encodeURIComponent(p)}`),
    content: (p: string) =>
      jsonFetch(
        FileContentResponseSchema,
        "files.content",
        `/files/content?path=${encodeURIComponent(p)}`,
      ),
  },

  notifications: {
    async recent() {
      const r = await jsonFetch(
        NotificationsRecentResponseSchema,
        "notifications.recent",
        "/notifications/recent",
      );
      return r.items;
    },
  },
};

// Silence unused import warning if safeParseWithWarn nao for usado diretamente aqui
void safeParseWithWarn;

// Cliente HTTP simples — todos endpoints sob /so/api/v1 e usam credentials.
const BASE = "/so/api/v1";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error ?? `HTTP ${r.status}`);
  }
  return (await r.json()) as T;
}

export interface User {
  sub: string;
  name: string;
  avatar: string;
}

export const api = {
  endpoint: BASE,

  async me(): Promise<User | null> {
    const r = await jsonFetch<{ user: User | null }>("/me");
    return r.user;
  },

  async login(username: string, password: string): Promise<User> {
    const r = await jsonFetch<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return r.user;
  },

  async logout(): Promise<void> {
    await jsonFetch("/auth/logout", { method: "POST" });
  },

  notes: {
    list: () => jsonFetch<{ notes: NoteDto[] }>("/notes").then((r) => r.notes),
    create: (title: string, body: string) =>
      jsonFetch<{ note: NoteDto }>("/notes", {
        method: "POST",
        body: JSON.stringify({ title, body }),
      }).then((r) => r.note),
    update: (id: string, patch: { title?: string; body?: string }) =>
      jsonFetch<{ note: NoteDto }>(`/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }).then((r) => r.note),
    remove: (id: string) =>
      jsonFetch<{ ok: true }>(`/notes/${id}`, { method: "DELETE" }),
  },

  files: {
    list: (p = "") =>
      jsonFetch<{ path: string; items: FileItem[] }>(`/files?path=${encodeURIComponent(p)}`),
    content: (p: string) =>
      jsonFetch<{ path: string; text: string }>(`/files/content?path=${encodeURIComponent(p)}`),
  },

  notifications: {
    recent: () =>
      jsonFetch<{ items: NotifDto[] }>("/notifications/recent").then((r) => r.items),
  },
};

export interface NoteDto {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  name: string;
  dir: boolean;
  size: number;
  modifiedAt: string;
}

export interface NotifDto {
  id: string;
  kind: "system" | "chat" | "note" | "file" | "info";
  title: string;
  body: string;
  createdAt: string;
}

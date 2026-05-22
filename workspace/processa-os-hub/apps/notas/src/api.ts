const BASE = "/so/api/v1";

async function j<T>(path: string, init?: RequestInit): Promise<T> {
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

export interface NoteDto {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  me: () => j<{ user: { sub: string; name: string; avatar: string } | null }>("/me"),
  list: () => j<{ notes: NoteDto[] }>("/notes").then((r) => r.notes),
  create: (title: string, body: string) =>
    j<{ note: NoteDto }>("/notes", {
      method: "POST",
      body: JSON.stringify({ title, body }),
    }).then((r) => r.note),
  update: (id: string, patch: { title?: string; body?: string }) =>
    j<{ note: NoteDto }>(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }).then((r) => r.note),
  remove: (id: string) => j<{ ok: true }>(`/notes/${id}`, { method: "DELETE" }),
};

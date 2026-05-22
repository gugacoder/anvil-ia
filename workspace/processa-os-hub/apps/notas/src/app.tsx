// Notas standalone (Vite SPA) — vive em /so/notas/.
// Embarcado dentro do shell via <iframe>. Mesmo backend, mesma sessao.
import { useEffect, useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { api, type NoteDto } from "./api";

export function App() {
  const [auth, setAuth] = useState<"loading" | "ok" | "guest">("loading");
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = notes.find((n) => n.id === activeId) ?? null;

  useEffect(() => {
    api
      .me()
      .then((r) => setAuth(r.user ? "ok" : "guest"))
      .catch(() => setAuth("guest"));
  }, []);

  useEffect(() => {
    if (auth !== "ok") return;
    api.list().then((list) => {
      setNotes(list);
      if (!activeId && list.length) setActiveId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  if (auth === "loading") {
    return <div className="grid h-full place-items-center text-sm text-muted-foreground">…</div>;
  }
  if (auth === "guest") {
    return (
      <div className="grid h-full place-items-center bg-background p-6 text-center">
        <div>
          <AlertCircle className="mx-auto h-6 w-6 text-primary" />
          <div className="mt-2 text-sm">
            Sessão expirada. Abra este app pelo Processa OS.
          </div>
        </div>
      </div>
    );
  }

  async function create() {
    const n = await api.create("Nova nota", "");
    setNotes((p) => [n, ...p]);
    setActiveId(n.id);
  }

  async function save(patch: { title?: string; body?: string }) {
    if (!active) return;
    const updated = await api.update(active.id, patch);
    setNotes((p) => p.map((n) => (n.id === updated.id ? updated : n)));
  }

  async function remove(id: string) {
    await api.remove(id);
    setNotes((p) => p.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="flex h-full bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Notas</span>
          <button
            type="button"
            onClick={create}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Nova nota"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!notes.length && (
            <div className="px-3 py-4 text-xs text-muted-foreground">
              Crie sua primeira nota.
            </div>
          )}
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setActiveId(n.id)}
              className={`group flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-sm hover:bg-accent ${
                n.id === activeId ? "bg-accent" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{n.title || "Sem título"}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {new Date(n.updatedAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  void remove(n.id);
                }}
                className="rounded p-1 text-muted-foreground opacity-0 hover:text-rose-400 group-hover:opacity-100"
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <input
              value={active.title}
              onChange={(e) =>
                setNotes((p) =>
                  p.map((n) => (n.id === active.id ? { ...n, title: e.target.value } : n)),
                )
              }
              onBlur={(e) => void save({ title: e.target.value })}
              className="border-b border-border bg-transparent px-4 py-3 text-lg font-semibold outline-none"
              placeholder="Título"
            />
            <textarea
              value={active.body}
              onChange={(e) =>
                setNotes((p) =>
                  p.map((n) => (n.id === active.id ? { ...n, body: e.target.value } : n)),
                )
              }
              onBlur={(e) => void save({ body: e.target.value })}
              className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none"
              placeholder="Escreva…"
            />
          </>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Selecione ou crie uma nota.
          </div>
        )}
      </div>
    </div>
  );
}

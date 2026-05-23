// Notas standalone (Vite SPA) — vive em /so/notas/.
// Federado no shell via Module Federation. Mesmo backend, mesma sessao.
//
// Multi-instância: aceita AppInstanceProps quando montado pelo shell.
// Rota canônica `/nota/:id` mantém a nota ativa sincronizada com o shell,
// permitindo "Duplicar com path corrente" e deep-link entre janelas.
//
// Responsividade: detecta viewport narrow (<640px) e alterna entre layout
// 2-colunas (desktop) e stack list/editor (mobile, uma view por vez).
import { useEffect, useState } from "react";
import { MemoryRouter, Routes, Route, useNavigate, useLocation, useParams } from "react-router-dom";
import { Plus, Trash2, AlertCircle, ChevronLeft } from "lucide-react";
import { api, type NoteDto } from "./api";
import { useAppStorage } from "./pos-storage";

interface AppInstanceProps {
  instanceId?: string;
  initialPath?: string;
  onPathChange?: (path: string) => void;
  onTitleChange?: (title: string) => void;
  formFactor?: "desktop" | "mobile";
}

// Hook interno — Notas decide layout por viewport propria (regra: cada app
// federado se adapta sozinho, sem dependencia de sinal do shell).
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

export default function App(props: AppInstanceProps = {}) {
  const scope = props.instanceId ?? "solo";
  // Retoma último path conhecido por instância (sobrevive a reload em
  // qualquer layout — não depende do shell rehidratar initialPath).
  const [lastPath, setLastPath] = useAppStorage<string>(scope, "last-path", "/");
  const initialPath = props.initialPath && props.initialPath !== "/" ? props.initialPath : lastPath;

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <RouteSync
        onPathChange={(p) => {
          setLastPath(p);
          props.onPathChange?.(p);
        }}
      />
      <Routes>
        <Route path="/" element={<NotasShell scope={scope} activeId={null} />} />
        <Route path="/nota/:id" element={<NotasRouteWrapper scope={scope} />} />
      </Routes>
    </MemoryRouter>
  );
}

function RouteSync({ onPathChange }: { onPathChange?: (p: string) => void }) {
  const loc = useLocation();
  useEffect(() => {
    onPathChange?.(loc.pathname);
  }, [loc.pathname, onPathChange]);
  return null;
}

function NotasRouteWrapper({ scope }: { scope: string }) {
  const { id } = useParams<{ id: string }>();
  return <NotasShell scope={scope} activeId={id ?? null} />;
}

function NotasShell({ scope, activeId }: { scope: string; activeId: string | null }) {
  const navigate = useNavigate();
  const narrow = useIsNarrow();
  const [auth, setAuth] = useState<"loading" | "ok" | "guest">("loading");
  const [notes, setNotes] = useState<NoteDto[]>([]);
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
      // Desktop: auto-seleciona primeira nota (UX 2-colunas).
      // Mobile: comeca na list — usuario escolhe qual abrir.
      if (!narrow && !activeId && list.length) {
        navigate(`/nota/${list[0].id}`, { replace: true });
      }
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
    navigate(`/nota/${n.id}`);
  }

  async function save(patch: { title?: string; body?: string }) {
    if (!active) return;
    const updated = await api.update(active.id, patch);
    setNotes((p) => p.map((n) => (n.id === updated.id ? updated : n)));
  }

  async function remove(id: string) {
    await api.remove(id);
    setNotes((p) => p.filter((n) => n.id !== id));
    if (activeId === id) navigate("/", { replace: true });
  }

  function selectNote(id: string) {
    navigate(`/nota/${id}`);
  }

  // Layout mobile: list OU editor (nunca os dois).
  // O activeId controla qual exibir.
  if (narrow) {
    return active ? (
      <EditorView
        scope={scope}
        note={active}
        onChange={(patch) =>
          setNotes((p) => p.map((n) => (n.id === active.id ? { ...n, ...patch } : n)))
        }
        onSave={save}
        onBack={() => navigate("/")}
      />
    ) : (
      <ListView
        notes={notes}
        activeId={activeId}
        onSelect={selectNote}
        onCreate={create}
        onRemove={remove}
        narrow
      />
    );
  }

  // Layout desktop: lado-a-lado.
  return (
    <div className="flex h-full bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border">
        <ListView
          notes={notes}
          activeId={activeId}
          onSelect={selectNote}
          onCreate={create}
          onRemove={remove}
          narrow={false}
        />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <EditorBody
            scope={scope}
            note={active}
            onChange={(patch) =>
              setNotes((p) => p.map((n) => (n.id === active.id ? { ...n, ...patch } : n)))
            }
            onSave={save}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Selecione ou crie uma nota.
          </div>
        )}
      </div>
    </div>
  );
}

function ListView({
  notes,
  activeId,
  onSelect,
  onCreate,
  onRemove,
  narrow,
}: {
  notes: NoteDto[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRemove: (id: string) => void;
  narrow: boolean;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      {!narrow && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Notas</span>
          <button
            type="button"
            onClick={onCreate}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Nova nota"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!notes.length && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Crie sua primeira nota.
          </div>
        )}
        {notes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className={`group flex w-full items-center justify-between gap-2 border-b border-border px-4 ${
              narrow ? "py-3 min-h-[60px]" : "py-2"
            } text-left text-sm hover:bg-accent active:bg-accent ${
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
                void onRemove(n.id);
              }}
              className={`rounded p-2 text-muted-foreground hover:text-rose-400 ${
                narrow ? "opacity-60" : "opacity-0 group-hover:opacity-100"
              }`}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>
      {/* FAB so em mobile */}
      {narrow && (
        <button
          type="button"
          onClick={onCreate}
          className="absolute right-4 bottom-4 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
          aria-label="Nova nota"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

function EditorView({
  scope,
  note,
  onChange,
  onSave,
  onBack,
}: {
  scope: string;
  note: NoteDto;
  onChange: (patch: Partial<NoteDto>) => void;
  onSave: (patch: { title?: string; body?: string }) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-medium text-muted-foreground">
          {note.title || "Sem título"}
        </span>
      </div>
      <EditorBody scope={scope} note={note} onChange={onChange} onSave={onSave} />
    </div>
  );
}

function EditorBody({
  scope,
  note,
  onChange,
  onSave,
}: {
  scope: string;
  note: NoteDto;
  onChange: (patch: Partial<NoteDto>) => void;
  onSave: (patch: { title?: string; body?: string }) => void;
}) {
  // Draft layer: o que o user digita persiste por nota mesmo antes do blur.
  // Salva pro server no blur (como antes); ao mesmo tempo limpa o draft.
  const draftKey = `draft.${note.id}`;
  const [draft, setDraft] = useAppStorage<{ title?: string; body?: string }>(
    scope,
    draftKey,
    {},
  );
  const title = draft.title ?? note.title;
  const body = draft.body ?? note.body;
  return (
    <>
      <input
        value={title}
        onChange={(e) => {
          setDraft((d) => ({ ...d, title: e.target.value }));
          onChange({ title: e.target.value });
        }}
        onBlur={(e) => {
          void onSave({ title: e.target.value });
          setDraft((d) => ({ ...d, title: undefined }));
        }}
        className="border-b border-border bg-transparent px-4 py-3 text-lg font-semibold outline-none"
        placeholder="Título"
      />
      <textarea
        value={body}
        onChange={(e) => {
          setDraft((d) => ({ ...d, body: e.target.value }));
          onChange({ body: e.target.value });
        }}
        onBlur={(e) => {
          void onSave({ body: e.target.value });
          setDraft((d) => ({ ...d, body: undefined }));
        }}
        className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none"
        placeholder="Escreva…"
      />
    </>
  );
}

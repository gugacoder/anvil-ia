// =============================================================================
// DesktopAppLens — gaveta flutuante de apps no desktop. Floata acima do dock
// (z-[10010], topmost da shell) e mostra TODOS os apps em grid. Pinados
// destacados pelo estado visual; modo Editar permite toggle por click.
// Search com filtro live. HomeShortcut minimiza todas as janelas.
//
// Abertura: botão Lens no dock OU atalho Cmd/Ctrl+Shift+Space.
// Fechamento: click-fora, X, Esc, ou re-toggle do atalho.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, X, Home } from "lucide-react";
import type { AppDef } from "../apps/registry";
import { useWindows } from "../lib/windows";
import { useWindowedAppStatus, type AppStatus } from "../lib/use-app-status";
import { AppStatusIndicator } from "./AppStatusIndicator";

interface Props {
  open: boolean;
  onClose: () => void;
  apps: AppDef[];
  pinned: string[];
  onLaunch: (app: AppDef) => void;
  onTogglePin: (slug: string) => void;
}

export function DesktopAppLens({
  open,
  onClose,
  apps,
  pinned,
  onLaunch,
  onTogglePin,
}: Props) {
  const { minimizeAll } = useWindows();
  const { status: appStatus } = useWindowedAppStatus();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  // Esc fecha a lens. Captura no listener global (não conflita com input).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Foco automático no search quando abre. Limpa query ao fechar.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    setQuery("");
    setEditing(false);
  }, [open]);

  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);

  // Ordenação: pinados primeiro (na ordem do `pinned`), depois o resto na
  // ordem do registry. Quando há busca, ordem é só por matching.
  const ordered = useMemo(() => {
    const byId = new Map(apps.map((a) => [a.id, a]));
    const pinnedApps = pinned.map((slug) => byId.get(slug)).filter((a): a is AppDef => !!a);
    const rest = apps.filter((a) => !pinnedSet.has(a.id));
    return [...pinnedApps, ...rest];
  }, [apps, pinned, pinnedSet]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (a) => a.label.toLowerCase().includes(q) || a.id.includes(q),
    );
  }, [ordered, query]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay click-fora — captura clicks sem escurecer demais. */}
          <motion.div
            key="lens-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            className="fixed inset-0 z-[10005] bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Painel — flutua centralizado acima do dock. */}
          <motion.div
            key="lens-panel"
            role="dialog"
            aria-label="Buscar apps"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 360, damping: 30 }
            }
            className="os-glass-strong fixed bottom-24 left-1/2 z-[10010] flex max-h-[70vh] w-[min(720px,92vw)] -translate-x-1/2 flex-col overflow-hidden rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: busca + editar + fechar */}
            <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3">
              <div className="flex flex-1 items-center gap-2 rounded-full bg-foreground/8 px-3 py-1.5 ring-1 ring-foreground/12">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar apps"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="button"
                onClick={() => setEditing((e) => !e)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
                  editing
                    ? "bg-primary text-primary-foreground ring-transparent"
                    : "bg-foreground/8 text-foreground ring-foreground/12 hover:bg-foreground/12"
                }`}
              >
                {editing ? "Pronto" : "Editar"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto px-4 pt-3 pb-4">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-y-5">
                {!query && (
                  <HomeShortcut
                    onActivate={() => {
                      minimizeAll();
                      onClose();
                    }}
                  />
                )}
                {filtered.map((app) => {
                  const isPinned = pinnedSet.has(app.id);
                  return (
                    <LensIcon
                      key={app.id}
                      app={app}
                      pinned={isPinned}
                      editing={editing}
                      status={appStatus.get(app.id)}
                      onLaunch={() => {
                        onLaunch(app);
                        onClose();
                      }}
                      onTogglePin={() => onTogglePin(app.id)}
                    />
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <div className="grid h-32 place-items-center text-sm text-muted-foreground">
                  Nenhum app encontrado.
                </div>
              )}
              {editing && (
                <div className="mt-4 rounded-2xl bg-foreground/8 px-3 py-2 text-[11px] text-muted-foreground">
                  Click pra fixar/desafixar no dock. No dock, arraste pra reordenar.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function HomeShortcut({ onActivate }: { onActivate: () => void }) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className="group flex flex-col items-center gap-1.5 outline-none"
      title="Minimizar tudo e mostrar a área de trabalho"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-sm ring-1 ring-primary/50 backdrop-blur transition-transform group-active:scale-90">
        <Home className="h-7 w-7 text-primary-foreground" strokeWidth={1.9} />
      </span>
      <span className="max-w-[88px] truncate text-[11px] font-medium text-primary">
        Área de trabalho
      </span>
    </button>
  );
}

function LensIcon({
  app,
  pinned,
  editing,
  status,
  onLaunch,
  onTogglePin,
}: {
  app: AppDef;
  pinned: boolean;
  editing: boolean;
  status: AppStatus | undefined;
  onLaunch: () => void;
  onTogglePin: () => void;
}) {
  const Icon = app.Icon;
  return (
    <button
      type="button"
      onClick={editing ? onTogglePin : onLaunch}
      className="group relative flex flex-col items-center gap-1.5 outline-none"
    >
      <span
        className={`relative grid h-14 w-14 place-items-center rounded-2xl shadow-sm backdrop-blur transition-transform group-active:scale-90 ${
          pinned
            ? "bg-primary/15 ring-1 ring-primary/40"
            : "bg-foreground/8 ring-1 ring-foreground/12"
        }`}
      >
        <Icon
          className={`h-7 w-7 ${pinned ? "text-primary" : "text-foreground"}`}
          strokeWidth={1.9}
        />
        {editing && pinned && (
          <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
            ★
          </span>
        )}
        <AppStatusIndicator status={status} />
      </span>
      <span className="max-w-[88px] truncate text-[11px] font-medium text-foreground">
        {app.label}
      </span>
    </button>
  );
}

// =============================================================================
// MobileAppDrawer — gaveta de apps. Slide up do rodape, mostra TODOS os apps
// em grid. Tap em app = abre fullscreen e fecha drawer. Long-press = pin/unpin
// do dock (futuro). Por enquanto so launch.
// =============================================================================

import { useMemo, useState, useEffect } from "react";
import { Search, X, Home } from "lucide-react";
import type { AppDef } from "../../apps/registry";
import { useMobState } from "../../lib/mob-state";
import { useLongPress } from "../../lib/use-long-press";
import { haptic } from "../../lib/haptics";

const DOCK_KEY = "mob.dock.v1";
const DOCK_SIZE = 4;

export function MobileAppDrawer({ apps, open }: { apps: AppDef[]; open: boolean }) {
  const { launchApp, closeDrawer, goHome } = useMobState();
  const [query, setQuery] = useState("");
  const [dockSlugs, setDockSlugs] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOCK_KEY);
      if (raw) setDockSlugs(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((a) => a.label.toLowerCase().includes(q) || a.id.includes(q));
  }, [apps, query]);

  function togglePin(slug: string) {
    setDockSlugs((cur) => {
      const has = cur.includes(slug);
      let next: string[];
      if (has) next = cur.filter((s) => s !== slug);
      else if (cur.length < DOCK_SIZE) next = [...cur, slug];
      else {
        haptic("warning");
        return cur; // dock cheio
      }
      localStorage.setItem(DOCK_KEY, JSON.stringify(next));
      haptic("medium");
      // notifica o dock pra recarregar
      window.dispatchEvent(new CustomEvent("mob:dock-changed"));
      return next;
    });
  }

  return (
    <div
      className="os-glass-strong fixed inset-x-0 bottom-0 z-[50] flex max-h-[88dvh] flex-col rounded-t-3xl shadow-2xl will-change-transform"
      style={{
        paddingBottom: "calc(var(--sa-bottom) + var(--dock-h, 76px) + 8px)",
        pointerEvents: open ? "auto" : "none",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 320ms cubic-bezier(0.32, 0.72, 0.24, 1)",
      }}
    >
      {/* Overlay click-outside vive como sibling no MobileShell. */}
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="h-1 w-12 rounded-full bg-foreground/30" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pb-2">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-card/70 px-3 py-1.5 ring-1 ring-border/40">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
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
              : "bg-card/70 text-foreground ring-border/40"
          }`}
        >
          {editing ? "Pronto" : "Editar"}
        </button>
        <button
          type="button"
          onClick={closeDrawer}
          className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Grid de apps */}
      <div className="flex-1 overflow-auto px-4 pb-3">
        <div className="grid grid-cols-4 gap-y-5 pt-2">
          {/* Atalho fixo: ir pra area de trabalho (esconde app em foreground).
              So aparece quando nao ha busca ativa. Look diferenciado pra destacar. */}
          {!query && (
            <HomeShortcut
              onActivate={() => {
                haptic("light");
                goHome();
              }}
            />
          )}
          {filtered.map((app) => (
            <DrawerIcon
              key={app.id}
              app={app}
              pinned={dockSlugs.includes(app.id)}
              editing={editing}
              onLaunch={() => {
                haptic("light");
                launchApp(app);
                closeDrawer();
              }}
              onTogglePin={() => togglePin(app.id)}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="grid h-32 place-items-center text-sm text-muted-foreground">
            Nenhum app encontrado.
          </div>
        )}
        {editing && (
          <div className="mt-4 rounded-2xl bg-card/60 px-3 py-2 text-[11px] text-muted-foreground">
            Tap pra fixar/desafixar no dock (máx {DOCK_SIZE}).
          </div>
        )}
      </div>
    </div>
  );
}

function HomeShortcut({ onActivate }: { onActivate: () => void }) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className="group flex flex-col items-center gap-1.5 outline-none"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-sm ring-1 ring-primary/50 backdrop-blur transition-transform group-active:scale-90">
        <Home className="h-7 w-7 text-primary-foreground" strokeWidth={1.9} />
      </span>
      <span className="max-w-[72px] truncate text-[11px] font-medium text-primary">
        Área de trabalho
      </span>
    </button>
  );
}

function DrawerIcon({
  app,
  pinned,
  editing,
  onLaunch,
  onTogglePin,
}: {
  app: AppDef;
  pinned: boolean;
  editing: boolean;
  onLaunch: () => void;
  onTogglePin: () => void;
}) {
  const lp = useLongPress(() => {
    haptic("medium");
    onTogglePin();
  }, 480);
  const Icon = app.Icon;
  return (
    <button
      type="button"
      onClick={editing ? onTogglePin : onLaunch}
      {...lp}
      className="group relative flex flex-col items-center gap-1.5 outline-none"
    >
      <span
        className={`grid h-14 w-14 place-items-center rounded-2xl shadow-sm backdrop-blur transition-transform group-active:scale-90 ${
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
      </span>
      <span className="max-w-[72px] truncate text-[11px] font-medium text-foreground">
        {app.label}
      </span>
    </button>
  );
}

// =============================================================================
// Window Manager — abre apps como janelas com drag, resize, min/max/close, z-index.
// Suporta multi-instância para apps com flag `multi`.
//
// Persistência: a lista de janelas (sem o `app: AppDef`, que vem do registry)
// e o contador de instâncias por app ficam em localStorage sob
// `pos:shell:<sub>:win`. Estado de cada app vive sob `pos:state:<sub>:<winId>:*`
// via `useAppStorage(instanceId, ...)`. Minimizar não desmonta — mantém o
// estado em memória; reload do browser rehydrata pelo storage.
// =============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppDef, AppInstanceProps } from "../apps/registry";
import { clearScope, loadJSON, saveJSON, shellKey } from "./app-storage";
import { useUserSub } from "./user-context";

export interface WinSpec {
  appId: string;
  app: AppDef;
  initial?: { x?: number; y?: number; w?: number; h?: number };
  minSize?: { w: number; h: number };
  initialPath?: string;
}

export interface WinState {
  id: string;
  appId: string;
  app: AppDef;
  title: string;
  baseTitle: string;
  /** Sufixo numérico para janelas 2+ do mesmo app (ex: "Chat (2)"). */
  instanceIndex: number;
  initialPath: string;
  currentPath: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  openedAt: number;
  minSize?: { w: number; h: number };
  minimized: boolean;
  maximized: boolean;
  prev?: { x: number; y: number; w: number; h: number };
}

interface Ctx {
  windows: WinState[];
  open: (spec: WinSpec) => void;
  openNew: (app: AppDef, initialPath?: string) => void;
  duplicate: (id: string) => void;
  close: (id: string) => void;
  closeAll: (appId: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  minimizeAll: () => void;
  toggleMaximize: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number) => void;
  setCurrentPath: (id: string, path: string) => void;
  setDynamicTitle: (id: string, title: string | null) => void;
  activeId: string | null;
  /** Chamado após apps carregarem do registry — re-monta janelas salvas. */
  hydrate: (apps: AppDef[]) => void;
}

/** Versão serializável de WinState (sem AppDef nem snapshot de minimize). */
interface PersistedWin {
  id: string;
  appId: string;
  title: string;
  baseTitle: string;
  instanceIndex: number;
  initialPath: string;
  currentPath: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  openedAt: number;
  minSize?: { w: number; h: number };
  minimized: boolean;
  maximized: boolean;
  prev?: { x: number; y: number; w: number; h: number };
}

interface PersistedWins {
  windows: PersistedWin[];
  idCounter: number;
  nextZ: number;
}

const STORAGE_KEY = "win";

const WinCtx = createContext<Ctx | null>(null);

const TOP_BAR = 36;
const DOCK_RESERVED = 80;
// Shell (TopBar, Dock, dropdowns, toasts) vive em z >= 9999.
// Janelas ficam confinadas abaixo disso para garantir always-on-top da shell.
const WIN_Z_MAX = 9000;

// Contadores module-level — re-inicializados a partir do storage no boot
// pelo provider (via `restoreCounters`), pra IDs e z não colidirem com o que
// já foi serializado.
let nextZ = 10;
function bumpZ() {
  nextZ = nextZ >= WIN_Z_MAX ? 10 : nextZ + 1;
  return nextZ;
}

let idCounter = 0;
function genId(appId: string) {
  idCounter += 1;
  return `${appId}-${idCounter}`;
}

function restoreCounters(z: number, ids: number) {
  if (z > nextZ) nextZ = z;
  if (ids > idCounter) idCounter = ids;
}

function fitToViewport(w: WinState): WinState {
  const vw = window.innerWidth;
  const vh = window.innerHeight - TOP_BAR - DOCK_RESERVED;
  return {
    ...w,
    w: Math.min(w.w, vw - 16),
    h: Math.min(w.h, vh - 16),
    x: Math.max(8, Math.min(w.x, vw - w.w - 8)),
    y: Math.max(TOP_BAR + 8, Math.min(w.y, TOP_BAR + vh - 80)),
  };
}

function createWin(spec: WinSpec, prevWindows: WinState[]): WinState {
  const vw = window.innerWidth;
  const vh = window.innerHeight - TOP_BAR - DOCK_RESERVED;
  const w = spec.initial?.w ?? spec.app.defaultSize?.w ?? Math.min(880, vw - 80);
  const h = spec.initial?.h ?? spec.app.defaultSize?.h ?? Math.min(560, vh - 60);
  const x =
    spec.initial?.x ?? Math.max(40, (vw - w) / 2 + (prevWindows.length % 6) * 24);
  const y = spec.initial?.y ?? TOP_BAR + 24 + (prevWindows.length % 6) * 24;
  const sameApp = prevWindows.filter((p) => p.appId === spec.appId);
  const instanceIndex = sameApp.length + 1;
  const baseTitle = spec.app.label;
  const initialPath = spec.initialPath ?? spec.app.defaultPath ?? "/";
  return fitToViewport({
    id: genId(spec.appId),
    appId: spec.appId,
    app: spec.app,
    title: instanceIndex > 1 ? `${baseTitle} (${instanceIndex})` : baseTitle,
    baseTitle,
    instanceIndex,
    initialPath,
    currentPath: initialPath,
    x,
    y,
    w,
    h,
    z: bumpZ(),
    openedAt: Date.now(),
    minSize: spec.minSize,
    minimized: false,
    maximized: false,
  });
}

function toPersisted(w: WinState): PersistedWin {
  const { app, ...rest } = w;
  void app;
  return rest;
}

function parseInstanceCounter(id: string): number {
  const m = /-([0-9]+)$/.exec(id);
  return m ? parseInt(m[1], 10) : 0;
}

export function WindowsProvider({ children }: { children: ReactNode }) {
  const sub = useUserSub();
  const fullKey = shellKey(sub, STORAGE_KEY);

  // Snapshot persistido — sem AppDef. Resolvido em `hydrate(apps)`.
  const persistedRef = useRef<PersistedWins>(
    loadJSON<PersistedWins>(fullKey, { windows: [], idCounter: 0, nextZ: 10 }),
  );
  // Aplica os contadores imediatamente — antes de qualquer createWin.
  restoreCounters(persistedRef.current.nextZ, persistedRef.current.idCounter);

  const [windows, setWindows] = useState<WinState[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Persiste cada mudança depois de hidratar
  useEffect(() => {
    if (!hydrated) return;
    saveJSON(fullKey, {
      windows: windows.map(toPersisted),
      idCounter,
      nextZ,
    } satisfies PersistedWins);
  }, [fullKey, windows, hydrated]);

  const hydrate = useCallback((apps: AppDef[]) => {
    setHydrated((already) => {
      if (already) return already;
      const byId = new Map(apps.map((a) => [a.id, a]));
      const restored: WinState[] = [];
      let maxIds = idCounter;
      for (const p of persistedRef.current.windows) {
        const app = byId.get(p.appId);
        if (!app) continue;
        restored.push({ ...p, app });
        const n = parseInstanceCounter(p.id);
        if (n > maxIds) maxIds = n;
      }
      restoreCounters(persistedRef.current.nextZ, maxIds);
      setWindows(restored);
      return true;
    });
  }, []);

  const focus = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, z: bumpZ(), minimized: false } : w)),
    );
  }, []);

  const open = useCallback((spec: WinSpec) => {
    setWindows((prev) => {
      // Singleton: foca existente em vez de criar nova.
      if (!spec.app.multi) {
        const existing = prev.find((w) => w.appId === spec.appId);
        if (existing) {
          return prev.map((w) =>
            w.id === existing.id ? { ...w, z: bumpZ(), minimized: false } : w,
          );
        }
      }
      return [...prev, createWin(spec, prev)];
    });
  }, []);

  const openNew = useCallback((app: AppDef, initialPath?: string) => {
    setWindows((prev) => [
      ...prev,
      createWin({ appId: app.id, app, initialPath }, prev),
    ]);
  }, []);

  const duplicate = useCallback((id: string) => {
    setWindows((prev) => {
      const src = prev.find((w) => w.id === id);
      if (!src || !src.app.multi) return prev;
      const copy = createWin(
        {
          appId: src.appId,
          app: src.app,
          initialPath: src.currentPath,
          initial: { w: src.w, h: src.h },
        },
        prev,
      );
      // posiciona ligeiramente deslocado da origem
      copy.x = Math.min(src.x + 24, window.innerWidth - copy.w - 8);
      copy.y = Math.min(src.y + 24, window.innerHeight - DOCK_RESERVED - copy.h - 8);
      return [...prev, copy];
    });
  }, []);

  const close = useCallback(
    (id: string) => {
      setWindows((prev) => prev.filter((w) => w.id !== id));
      clearScope(sub, id);
    },
    [sub],
  );

  const closeAll = useCallback(
    (appId: string) => {
      setWindows((prev) => {
        for (const w of prev) {
          if (w.appId === appId) clearScope(sub, w.id);
        }
        return prev.filter((w) => w.appId !== appId);
      });
    },
    [sub],
  );

  const minimize = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const minimizeAll = useCallback(() => {
    setWindows((prev) =>
      prev.every((w) => w.minimized) ? prev : prev.map((w) => ({ ...w, minimized: true })),
    );
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized && w.prev) {
          return { ...w, ...w.prev, maximized: false, prev: undefined };
        }
        // Janela maximizada vai até o rodapé (passa atrás do filete/dock).
        // O respiro horizontal pro filete é dado pelo padding interno do
        // conteúdo, não pela altura da janela.
        const vw = window.innerWidth;
        const vh = window.innerHeight - TOP_BAR;
        return {
          ...w,
          prev: { x: w.x, y: w.y, w: w.w, h: w.h },
          x: 8,
          y: TOP_BAR + 8,
          w: vw - 16,
          h: vh - 8,
          maximized: true,
          z: bumpZ(),
        };
      }),
    );
  }, []);

  const move = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id || w.maximized) return w;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const minY = TOP_BAR + 8;
        const maxY = vh - DOCK_RESERVED - 40;
        const minX = -(w.w - 80);
        const maxX = vw - 80;
        return {
          ...w,
          x: Math.max(minX, Math.min(x, maxX)),
          y: Math.max(minY, Math.min(y, maxY)),
        };
      }),
    );
  }, []);

  const resize = useCallback((id: string, w: number, h: number) => {
    setWindows((prev) =>
      prev.map((win) =>
        win.id === id && !win.maximized
          ? {
              ...win,
              w: Math.max(win.minSize?.w ?? 320, w),
              h: Math.max(win.minSize?.h ?? 200, h),
            }
          : win,
      ),
    );
  }, []);

  const setCurrentPath = useCallback((id: string, path: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id && w.currentPath !== path ? { ...w, currentPath: path } : w)),
    );
  }, []);

  const setDynamicTitle = useCallback((id: string, title: string | null) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const fallback =
          w.instanceIndex > 1 ? `${w.baseTitle} (${w.instanceIndex})` : w.baseTitle;
        const next = title && title.trim() ? title : fallback;
        return w.title === next ? w : { ...w, title: next };
      }),
    );
  }, []);

  const activeId = useMemo(() => {
    const visible = windows.filter((w) => !w.minimized);
    if (!visible.length) return null;
    return visible.reduce((a, b) => (a.z > b.z ? a : b)).id;
  }, [windows]);

  const value = useMemo<Ctx>(
    () => ({
      windows,
      open,
      openNew,
      duplicate,
      close,
      closeAll,
      focus,
      minimize,
      minimizeAll,
      toggleMaximize,
      move,
      resize,
      setCurrentPath,
      setDynamicTitle,
      activeId,
      hydrate,
    }),
    [
      windows,
      open,
      openNew,
      duplicate,
      close,
      closeAll,
      focus,
      minimize,
      minimizeAll,
      toggleMaximize,
      move,
      resize,
      setCurrentPath,
      setDynamicTitle,
      activeId,
      hydrate,
    ],
  );

  return <WinCtx.Provider value={value}>{children}</WinCtx.Provider>;
}

export function useWindows() {
  const ctx = useContext(WinCtx);
  if (!ctx) throw new Error("WindowsProvider missing");
  return ctx;
}

// -----------------------------------------------------------------------------
// <WindowFrame> — visual chrome + interactions
// -----------------------------------------------------------------------------
/**
 * Quando a janela está maximizada E em foco, ela "negocia" sua chrome com a
 * topbar do SO: a titlebar da janela desaparece e o título + window controls
 * passam a viver na topbar. Perdeu foco (ou foi restaurada), volta a chrome.
 */
export function isNegotiated(win: WinState, activeId: string | null): boolean {
  return win.maximized && !win.minimized && win.id === activeId;
}

export function WindowFrame({ win }: { win: WinState }) {
  const {
    focus,
    move,
    resize,
    activeId,
    toggleMaximize,
    setCurrentPath,
    setDynamicTitle,
  } = useWindows();
  const isActive = activeId === win.id;
  // Maximizada perde titlebar permanentemente (independente de foco). A topbar
  // assume os controles só quando a janela é a referência (em foco).
  const titlebarHidden = win.maximized;
  const startDrag = useRef<{ mx: number; my: number; wx: number; wy: number } | null>(null);
  const startResize = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (startDrag.current) {
        const dx = e.clientX - startDrag.current.mx;
        const dy = e.clientY - startDrag.current.my;
        move(win.id, startDrag.current.wx + dx, startDrag.current.wy + dy);
      } else if (startResize.current) {
        const dx = e.clientX - startResize.current.mx;
        const dy = e.clientY - startResize.current.my;
        resize(win.id, startResize.current.w + dx, startResize.current.h + dy);
      }
    }
    function onUp() {
      startDrag.current = null;
      startResize.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [win.id, move, resize]);

  // Renderiza o app uma vez, memo por id+initialPath — preserva estado entre re-renders.
  const appProps: AppInstanceProps = useMemo(
    () => ({
      instanceId: win.id,
      initialPath: win.initialPath,
      onPathChange: (p) => setCurrentPath(win.id, p),
      onTitleChange: (t) => setDynamicTitle(win.id, t),
      formFactor: "desktop",
    }),
    [win.id, win.initialPath, setCurrentPath, setDynamicTitle],
  );
  const content = useMemo(() => win.app.render(appProps), [win.app, appProps]);

  return (
    <div
      className={`os-glass absolute flex flex-col overflow-hidden rounded-xl ${
        isActive ? "os-window-focus" : "opacity-95"
      }`}
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
        // Minimizar não desmonta — só esconde — pra preservar estado interno.
        display: win.minimized ? "none" : undefined,
      }}
      aria-hidden={win.minimized}
      onMouseDown={() => focus(win.id)}
    >
      {!titlebarHidden && (
        <div
          className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-2 select-none"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            startDrag.current = { mx: e.clientX, my: e.clientY, wx: win.x, wy: win.y };
            focus(win.id);
          }}
          onDoubleClick={() => toggleMaximize(win.id)}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <WindowTitleMenu win={win} />
          </div>
          <WindowControls win={win} />
        </div>
      )}
      <div
        className={`min-h-0 flex-1 overflow-hidden ${win.maximized ? "pb-8" : ""}`}
      >
        {content}
      </div>
      {!win.maximized && (
        <div
          className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            startResize.current = { mx: e.clientX, my: e.clientY, w: win.w, h: win.h };
            focus(win.id);
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// <WindowTitleMenu> + <WindowControls> — usados na titlebar da janela e na
// topbar quando a janela está negociada.
// -----------------------------------------------------------------------------
export function WindowTitleMenu({ win }: { win: WinState }) {
  const { focus, close, minimize, toggleMaximize, openNew, duplicate } = useWindows();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick() {
      setMenuOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [menuOpen]);

  const isMulti = !!win.app.multi;
  const Icon = win.app.Icon;

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          focus(win.id);
          setMenuOpen((o) => !o);
        }}
        title="Menu da janela"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="group flex items-center gap-1 rounded-md px-1.5 py-1 text-primary hover:bg-accent"
      >
        <span className="grid h-4 w-4 place-items-center">
          {/* ícone do app some no hover; dá lugar ao chevron */}
          <span className="block group-hover:hidden">{Icon ? <Icon className="h-4 w-4" /> : null}</span>
          <span className="hidden group-hover:block">
            <ChevronGlyph />
          </span>
        </span>
        <span className="text-foreground">{win.title}</span>
      </button>
      {menuOpen && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="os-glass absolute top-full left-0 z-[10000] mt-1 w-52 rounded-xl p-1 text-sm shadow-xl"
        >
          {isMulti && (
            <>
              <MenuItem
                label="Nova janela"
                onClick={() => {
                  setMenuOpen(false);
                  openNew(win.app);
                }}
              />
              <MenuItem
                label="Duplicar janela"
                onClick={() => {
                  setMenuOpen(false);
                  duplicate(win.id);
                }}
              />
              <MenuDivider />
            </>
          )}
          <MenuItem
            label="Minimizar"
            onClick={() => {
              setMenuOpen(false);
              minimize(win.id);
            }}
          />
          <MenuItem
            label={win.maximized ? "Restaurar" : "Maximizar"}
            onClick={() => {
              setMenuOpen(false);
              toggleMaximize(win.id);
            }}
          />
          <MenuDivider />
          <MenuItem
            label="Fechar"
            tone="danger"
            onClick={() => {
              setMenuOpen(false);
              close(win.id);
            }}
          />
        </div>
      )}
    </div>
  );
}

export function WindowControls({ win }: { win: WinState }) {
  const { close, minimize, toggleMaximize } = useWindows();
  return (
    <div className="flex items-center gap-1.5 pr-1">
      <WinButton onClick={() => minimize(win.id)} title="Minimizar" color="bg-amber-400" />
      <WinButton
        onClick={() => toggleMaximize(win.id)}
        title={win.maximized ? "Restaurar" : "Maximizar"}
        color="bg-emerald-400"
      />
      <WinButton onClick={() => close(win.id)} title="Fechar" color="bg-rose-500" />
    </div>
  );
}

function ChevronGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuItem({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center rounded-lg px-3 py-1.5 text-left text-sm hover:bg-accent ${
        tone === "danger" ? "text-rose-500 hover:text-rose-500" : "text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-border" />;
}

function WinButton({
  onClick,
  title,
  color,
}: {
  onClick: () => void;
  title: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="grid h-6 w-6 place-items-center rounded-md transition-colors hover:bg-foreground/8"
    >
      <span aria-hidden className={`h-3 w-3 rounded-full ${color} transition-opacity`} />
    </button>
  );
}

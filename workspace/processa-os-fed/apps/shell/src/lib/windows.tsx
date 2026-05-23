// =============================================================================
// Window Manager — abre apps como janelas com drag, resize, min/max/close, z-index.
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

export interface WinSpec {
  id: string;
  appId: string;
  title: string;
  icon: ReactNode;
  content: ReactNode;
  initial?: { x?: number; y?: number; w?: number; h?: number };
  minSize?: { w: number; h: number };
}

export interface WinState extends WinSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  prev?: { x: number; y: number; w: number; h: number };
}

interface Ctx {
  windows: WinState[];
  open: (spec: WinSpec) => void;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number) => void;
  activeId: string | null;
}

const WinCtx = createContext<Ctx | null>(null);

const TOP_BAR = 36;
const DOCK_RESERVED = 80;
// Shell (TopBar, Dock, dropdowns, toasts) vive em z >= 9999.
// Janelas ficam confinadas abaixo disso para garantir always-on-top da shell.
const WIN_Z_MAX = 9000;

let nextZ = 10;
function bumpZ() {
  nextZ = nextZ >= WIN_Z_MAX ? 10 : nextZ + 1;
  return nextZ;
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

export function WindowsProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WinState[]>([]);

  const focus = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, z: bumpZ(), minimized: false } : w)),
    );
  }, []);

  const open = useCallback((spec: WinSpec) => {
    setWindows((prev) => {
      const existing = prev.find((w) => w.appId === spec.appId);
      if (existing) {
        return prev.map((w) =>
          w.id === existing.id ? { ...w, z: bumpZ(), minimized: false } : w,
        );
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight - TOP_BAR - DOCK_RESERVED;
      const w = spec.initial?.w ?? Math.min(880, vw - 80);
      const h = spec.initial?.h ?? Math.min(560, vh - 60);
      const x = spec.initial?.x ?? Math.max(40, (vw - w) / 2 + (prev.length % 6) * 24);
      const y = spec.initial?.y ?? TOP_BAR + 24 + (prev.length % 6) * 24;
      const state: WinState = {
        ...spec,
        x,
        y,
        w,
        h,
        z: bumpZ(),
        minimized: false,
        maximized: false,
      };
      return [...prev, fitToViewport(state)];
    });
  }, []);

  const close = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimize = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized && w.prev) {
          return { ...w, ...w.prev, maximized: false, prev: undefined };
        }
        const vw = window.innerWidth;
        const vh = window.innerHeight - TOP_BAR - DOCK_RESERVED;
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
        // mantém pelo menos a title bar (~40px) visível na area util,
        // entre a TopBar e a Dock — janela nunca desaparece sob a dock.
        const minY = TOP_BAR + 8;
        const maxY = vh - DOCK_RESERVED - 40;
        const minX = -(w.w - 80); // permite encostar quase tudo na esquerda
        const maxX = vw - 80; // mas mantém ao menos 80px visíveis à direita
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

  const activeId = useMemo(() => {
    const visible = windows.filter((w) => !w.minimized);
    if (!visible.length) return null;
    return visible.reduce((a, b) => (a.z > b.z ? a : b)).id;
  }, [windows]);

  return (
    <WinCtx.Provider
      value={{ windows, open, close, focus, minimize, toggleMaximize, move, resize, activeId }}
    >
      {children}
    </WinCtx.Provider>
  );
}

export function useWindows() {
  const ctx = useContext(WinCtx);
  if (!ctx) throw new Error("WindowsProvider missing");
  return ctx;
}

// -----------------------------------------------------------------------------
// <WindowFrame> — visual chrome + interactions
// -----------------------------------------------------------------------------
export function WindowFrame({ win }: { win: WinState }) {
  const { focus, close, minimize, toggleMaximize, move, resize, activeId } = useWindows();
  const isActive = activeId === win.id;
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

  if (win.minimized) return null;

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
      }}
      onMouseDown={() => focus(win.id)}
    >
      <div
        className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-3 select-none"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          startDrag.current = { mx: e.clientX, my: e.clientY, wx: win.x, wy: win.y };
          focus(win.id);
        }}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-primary">{win.icon}</span>
          <span>{win.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <WinButton onClick={() => minimize(win.id)} title="Minimizar" color="bg-amber-400" />
          <WinButton onClick={() => toggleMaximize(win.id)} title={win.maximized ? "Restaurar" : "Maximizar"} color="bg-emerald-400" />
          <WinButton onClick={() => close(win.id)} title="Fechar" color="bg-rose-500" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{win.content}</div>
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
      className={`h-3.5 w-3.5 rounded-full ${color} transition-opacity hover:opacity-80`}
    />
  );
}

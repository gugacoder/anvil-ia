// =============================================================================
// WorkspaceState — estado da shell workspace (sidebar + breadcrumb + area
// central unica). Bem mais simples que o WindowsProvider: nao tem janelas, nao
// tem z-index, nao tem multi-instancia. Um app por vez. Estado de cada app
// preservado em memoria via render condicional invisible (mesmo padrao do
// MobileAppRuntime) e — através de useAppStorage — entre reloads do browser.
// =============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppDef } from "../apps/registry";
import { clearScope, loadJSON, saveJSON, shellKey } from "./app-storage";
import { useUserSub } from "./user-context";

export interface WorkspaceOpenApp {
  appId: string;
  app: AppDef;
  openedAt: number;
}

interface PersistedWorkspace {
  open: { appId: string; openedAt: number }[];
  currentId: string | null;
}

interface Ctx {
  /** Apps que ja foram abertos nesta sessao (preservam state em background). */
  open: WorkspaceOpenApp[];
  /** App em foreground (mostrado na area central). null = nenhum aberto ainda. */
  currentId: string | null;
  /** Sidebar retraida ou expandida. Persiste em localStorage. */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  /** Abre o app na area central (mantem outros em memoria). */
  launchApp: (app: AppDef) => void;
  /** Fecha o app (limpa seu estado persistido). */
  closeApp: (appId: string) => void;
  /** Volta pra "tela inicial" (sem app) — opcional, raramente usado. */
  goHome: () => void;
  /** Chamado após apps carregarem do registry — re-monta os apps salvos. */
  hydrate: (apps: AppDef[]) => void;
}

const WorkspaceCtx = createContext<Ctx | null>(null);

const SIDEBAR_KEY = "os.workspace.sidebar-collapsed";
const WORKSPACE_KEY = "ws";

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSidebarCollapsed(v: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function WorkspaceStateProvider({ children }: { children: ReactNode }) {
  const sub = useUserSub();
  const fullKey = shellKey(sub, WORKSPACE_KEY);

  const persisted = useMemo(
    () =>
      loadJSON<PersistedWorkspace>(fullKey, { open: [], currentId: null }),
    [fullKey],
  );

  const [open, setOpen] = useState<WorkspaceOpenApp[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(persisted.currentId);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() =>
    readSidebarCollapsed(),
  );

  useEffect(() => {
    writeSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(fullKey, {
      open: open.map((o) => ({ appId: o.appId, openedAt: o.openedAt })),
      currentId,
    } satisfies PersistedWorkspace);
  }, [fullKey, open, currentId, hydrated]);

  const hydrate = useCallback(
    (apps: AppDef[]) => {
      if (hydrated) return;
      const byId = new Map(apps.map((a) => [a.id, a]));
      const restored: WorkspaceOpenApp[] = [];
      for (const item of persisted.open) {
        const app = byId.get(item.appId);
        if (app) restored.push({ appId: item.appId, app, openedAt: item.openedAt });
      }
      setOpen(restored);
      if (persisted.currentId && !byId.has(persisted.currentId)) {
        setCurrentId(null);
      }
      setHydrated(true);
    },
    [hydrated, persisted],
  );

  const launchApp = useCallback((app: AppDef) => {
    setOpen((prev) => {
      if (prev.find((o) => o.appId === app.id)) return prev;
      return [...prev, { appId: app.id, app, openedAt: Date.now() }];
    });
    setCurrentId(app.id);
  }, []);

  const closeApp = useCallback(
    (appId: string) => {
      setOpen((prev) => prev.filter((o) => o.appId !== appId));
      setCurrentId((cur) => (cur === appId ? null : cur));
      clearScope(sub, appId);
    },
    [sub],
  );

  const goHome = useCallback(() => {
    setCurrentId(null);
  }, []);

  const setSidebarCollapsed = useCallback((v: boolean) => setSidebarCollapsedState(v), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsedState((c) => !c), []);

  const value = useMemo<Ctx>(
    () => ({
      open,
      currentId,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      launchApp,
      closeApp,
      goHome,
      hydrate,
    }),
    [
      open,
      currentId,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      launchApp,
      closeApp,
      goHome,
      hydrate,
    ],
  );

  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>;
}

export function useWorkspaceState(): Ctx {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) throw new Error("WorkspaceStateProvider missing");
  return ctx;
}

// =============================================================================
// Estado da shell mobile. Stack de apps abertos + app em foreground + flags
// de UI (switcher visivel, modo edicao da home, shade visivel).
//
// Persistência: `open` (lista de slugs) e `foregroundId` ficam em localStorage
// sob `pos:shell:<sub>:mob-*`. Apps abertos sobrevivem a reload do browser.
// `closeApp` limpa o estado daquele app (via clearScope); logout limpa tudo.
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

export interface MobOpenApp {
  appId: string;
  app: AppDef;
  openedAt: number;
}

interface PersistedMob {
  open: { appId: string; openedAt: number }[];
  foregroundId: string | null;
  homeOrder: string[];
}

interface MobCtx {
  open: MobOpenApp[]; // ordem cronologica de abertura
  foregroundId: string | null;
  switcherOpen: boolean;
  shadeOpen: boolean;
  drawerOpen: boolean;
  editMode: boolean;
  homeOrder: string[]; // ordem dos icones na home (slugs)
  setHomeOrder: (slugs: string[]) => void;
  launchApp: (app: AppDef) => void;
  closeApp: (appId: string) => void;
  bringToFront: (appId: string) => void;
  goHome: () => void;
  openSwitcher: () => void;
  closeSwitcher: () => void;
  openShade: () => void;
  closeShade: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setEditMode: (on: boolean) => void;
  /** Chamado após apps carregarem do registry — re-monta os apps salvos. */
  hydrate: (apps: AppDef[]) => void;
}

const Ctx = createContext<MobCtx | null>(null);

const STORAGE_KEY = "mob";

export function MobStateProvider({ children }: { children: ReactNode }) {
  const sub = useUserSub();
  const fullKey = shellKey(sub, STORAGE_KEY);

  // Carrega o snapshot persistido (sem AppDef ainda — hydrate o completa)
  const persisted = useMemo(
    () =>
      loadJSON<PersistedMob>(fullKey, {
        open: [],
        foregroundId: null,
        homeOrder: [],
      }),
    [fullKey],
  );

  const [open, setOpen] = useState<MobOpenApp[]>([]);
  const [foregroundId, setForegroundId] = useState<string | null>(
    persisted.foregroundId,
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [shadeOpen, setShadeOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [homeOrder, setHomeOrder] = useState<string[]>(persisted.homeOrder);
  const [hydrated, setHydrated] = useState(false);

  // Persiste a cada mudança relevante (depois de hidratar)
  useEffect(() => {
    if (!hydrated) return;
    saveJSON(fullKey, {
      open: open.map((o) => ({ appId: o.appId, openedAt: o.openedAt })),
      foregroundId,
      homeOrder,
    } satisfies PersistedMob);
  }, [fullKey, open, foregroundId, homeOrder, hydrated]);

  const hydrate = useCallback(
    (apps: AppDef[]) => {
      if (hydrated) return;
      const byId = new Map(apps.map((a) => [a.id, a]));
      const restored: MobOpenApp[] = [];
      for (const item of persisted.open) {
        const app = byId.get(item.appId);
        if (app) restored.push({ appId: item.appId, app, openedAt: item.openedAt });
      }
      setOpen(restored);
      // Se foregroundId aponta pra app que não existe mais, zera
      if (persisted.foregroundId && !byId.has(persisted.foregroundId)) {
        setForegroundId(null);
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
    setForegroundId(app.id);
    setSwitcherOpen(false);
    setShadeOpen(false);
    setDrawerOpen(false);
  }, []);

  const closeApp = useCallback(
    (appId: string) => {
      setOpen((prev) => prev.filter((o) => o.appId !== appId));
      setForegroundId((cur) => (cur === appId ? null : cur));
      clearScope(sub, appId);
    },
    [sub],
  );

  const bringToFront = useCallback((appId: string) => {
    setForegroundId(appId);
    setSwitcherOpen(false);
  }, []);

  const goHome = useCallback(() => {
    setForegroundId(null);
    setSwitcherOpen(false);
    setShadeOpen(false);
    setDrawerOpen(false);
    setEditMode(false);
  }, []);

  const openSwitcher = useCallback(() => setSwitcherOpen(true), []);
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);
  const openShade = useCallback(() => setShadeOpen(true), []);
  const closeShade = useCallback(() => setShadeOpen(false), []);
  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    setShadeOpen(false);
    setSwitcherOpen(false);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo<MobCtx>(
    () => ({
      open,
      foregroundId,
      switcherOpen,
      shadeOpen,
      drawerOpen,
      editMode,
      homeOrder,
      setHomeOrder,
      launchApp,
      closeApp,
      bringToFront,
      goHome,
      openSwitcher,
      closeSwitcher,
      openShade,
      closeShade,
      openDrawer,
      closeDrawer,
      setEditMode,
      hydrate,
    }),
    [
      open,
      foregroundId,
      switcherOpen,
      shadeOpen,
      drawerOpen,
      editMode,
      homeOrder,
      launchApp,
      closeApp,
      bringToFront,
      goHome,
      openSwitcher,
      closeSwitcher,
      openShade,
      closeShade,
      openDrawer,
      closeDrawer,
      hydrate,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMobState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("MobStateProvider missing");
  return ctx;
}

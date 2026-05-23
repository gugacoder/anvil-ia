// =============================================================================
// Estado da shell mobile. Stack de apps abertos + app em foreground + flags
// de UI (switcher visivel, modo edicao da home, shade visivel).
// =============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppDef } from "../apps/registry";

export interface MobOpenApp {
  appId: string;
  app: AppDef;
  openedAt: number;
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
}

const Ctx = createContext<MobCtx | null>(null);

export function MobStateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<MobOpenApp[]>([]);
  const [foregroundId, setForegroundId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [shadeOpen, setShadeOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [homeOrder, setHomeOrder] = useState<string[]>([]);

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

  const closeApp = useCallback((appId: string) => {
    setOpen((prev) => prev.filter((o) => o.appId !== appId));
    setForegroundId((cur) => (cur === appId ? null : cur));
  }, []);

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
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMobState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("MobStateProvider missing");
  return ctx;
}

import { useCallback, useEffect, useState } from "react";
import { TopBar } from "./TopBar";
import { Dock } from "./Dock";
import { DesktopIcons } from "./DesktopIcons";
import { DesktopAppLens } from "./DesktopAppLens";
import { NotificationCenter, ToastStack } from "./NotificationCenter";
import { useWindows, WindowFrame } from "../lib/windows";
import { useApps } from "../lib/use-apps";
import { useDesktopPinned } from "../lib/desktop-pinned";
import type { AppDef } from "../apps/registry";
import { api, type User } from "../lib/api";

export function Desktop({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { windows, open, hydrate } = useWindows();
  const [notifOpen, setNotifOpen] = useState(false);
  const [lensOpen, setLensOpen] = useState(false);
  const { apps, loading, error } = useApps();
  const { pinned, togglePin, reorder } = useDesktopPinned(apps);

  useEffect(() => {
    if (apps.length) hydrate(apps);
  }, [apps, hydrate]);

  const launch = useCallback(
    (app: AppDef) => {
      open({
        appId: app.id,
        app,
        initial: app.defaultSize,
        minSize: { w: 360, h: 240 },
      });
    },
    [open],
  );

  // Atalho global: Cmd/Ctrl+Shift+Espaço abre/fecha a lens.
  // Esc da lens é tratado dentro do próprio componente.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && (e.code === "Space" || e.key === " ")) {
        e.preventDefault();
        setLensOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function logout() {
    await api.logout();
    onLogout();
  }

  return (
    <div className="os-wallpaper relative h-full w-full overflow-hidden">
      <TopBar
        user={user}
        onLogout={logout}
        onOpenNotifications={() => setNotifOpen((o) => !o)}
      />
      {loading && (
        <div className="absolute top-14 left-4 z-[2] text-xs text-white/70 drop-shadow">
          Carregando registry…
        </div>
      )}
      {error && (
        <div className="absolute top-14 left-4 z-[2] text-xs text-rose-300 drop-shadow">
          Falha no registry: {error}
        </div>
      )}
      <DesktopIcons apps={apps} onLaunch={launch} />
      {windows.map((w) => (
        <WindowFrame key={w.id} win={w} />
      ))}
      <Dock
        apps={apps}
        pinned={pinned}
        onLaunch={launch}
        onReorder={reorder}
        onOpenLens={() => setLensOpen(true)}
        lensOpen={lensOpen}
      />
      <DesktopAppLens
        open={lensOpen}
        onClose={() => setLensOpen(false)}
        apps={apps}
        pinned={pinned}
        onLaunch={launch}
        onTogglePin={togglePin}
      />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
      <ToastStack />
    </div>
  );
}

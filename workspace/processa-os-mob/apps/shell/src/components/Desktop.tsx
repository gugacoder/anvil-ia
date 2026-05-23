import { useEffect, useState } from "react";
import { TopBar } from "./TopBar";
import { Dock } from "./Dock";
import { DesktopIcons } from "./DesktopIcons";
import { NotificationCenter, ToastStack } from "./NotificationCenter";
import { useWindows, WindowFrame } from "../lib/windows";
import { useApps } from "../lib/use-apps";
import type { AppDef } from "../apps/registry";
import { api, type User } from "../lib/api";

export function Desktop({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { windows, open, hydrate } = useWindows();
  const [notifOpen, setNotifOpen] = useState(false);
  const { apps, loading, error } = useApps();

  useEffect(() => {
    if (apps.length) hydrate(apps);
  }, [apps, hydrate]);

  function launch(app: AppDef) {
    open({
      appId: app.id,
      app,
      initial: app.defaultSize,
      minSize: { w: 360, h: 240 },
    });
  }

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
      <Dock apps={apps} onLaunch={launch} />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
      <ToastStack />
    </div>
  );
}

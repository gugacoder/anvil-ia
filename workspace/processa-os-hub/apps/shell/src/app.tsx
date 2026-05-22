import { useEffect, useState } from "react";
import { api, type User } from "./lib/api";
import { LockScreen } from "./components/LockScreen";
import { Desktop } from "./components/Desktop";
import { ThemeProvider } from "./lib/theme";
import { NotificationsProvider } from "./lib/notifications";
import { WindowsProvider } from "./lib/windows";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.me().then((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  return (
    <ThemeProvider>
      {!ready ? (
        <div className="os-wallpaper grid h-full w-full place-items-center">
          <div className="text-sm text-muted-foreground">Carregando…</div>
        </div>
      ) : user ? (
        <NotificationsProvider>
          <WindowsProvider>
            <Desktop user={user} onLogout={() => setUser(null)} />
          </WindowsProvider>
        </NotificationsProvider>
      ) : (
        <LockScreen onLogin={setUser} />
      )}
    </ThemeProvider>
  );
}

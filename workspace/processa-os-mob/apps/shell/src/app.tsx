import { useEffect, useState } from "react";
import { api, type User } from "./lib/api";
import { LockScreen } from "./components/LockScreen";
import { Desktop } from "./components/Desktop";
import { MobileShell } from "./components/mobile/MobileShell";
import { ThemeProvider } from "./lib/theme";
import { ColorThemeProvider } from "./lib/color-theme";
import { NotificationsProvider } from "./lib/notifications";
import { WindowsProvider } from "./lib/windows";
import { useBreakpoint, shellFor } from "./lib/use-breakpoint";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const breakpoint = useBreakpoint();
  const shell = shellFor(breakpoint);

  useEffect(() => {
    api.me().then((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  return (
    <ThemeProvider>
      <ColorThemeProvider>
        {!ready ? (
          <div className="os-wallpaper grid h-full w-full place-items-center">
            <div className="text-sm text-muted-foreground">Carregando…</div>
          </div>
        ) : user ? (
          <NotificationsProvider>
            {shell === "mobile" ? (
              <MobileShell user={user} onLogout={() => setUser(null)} />
            ) : (
              <WindowsProvider>
                <Desktop user={user} onLogout={() => setUser(null)} />
              </WindowsProvider>
            )}
          </NotificationsProvider>
        ) : (
          <LockScreen onLogin={setUser} />
        )}
      </ColorThemeProvider>
    </ThemeProvider>
  );
}

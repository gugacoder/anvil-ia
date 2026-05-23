import { useEffect, useState } from "react";
import { api, type User } from "./lib/api";
import { LockScreen } from "./components/LockScreen";
import { Desktop } from "./components/Desktop";
import { MobileShell } from "./components/mobile/MobileShell";
import { WorkspaceShell } from "./components/workspace/WorkspaceShell";
import { ThemeProvider } from "./lib/theme";
import { ColorThemeProvider } from "./lib/color-theme";
import { NotificationsProvider } from "./lib/notifications";
import { WindowsProvider } from "./lib/windows";
import { UserSubProvider } from "./lib/user-context";
import { clearUser } from "./lib/app-storage";
import { useBreakpoint, categoryFor } from "./lib/use-breakpoint";
import { resolveLayout } from "./lib/layout";

type ShellKind = "mobile" | "windowed" | "workspace";

function pickShell(bp: ReturnType<typeof useBreakpoint>): ShellKind {
  const category = categoryFor(bp);
  if (!category) return "mobile";
  return resolveLayout(category).shell;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const bp = useBreakpoint();
  const shell = pickShell(bp);

  useEffect(() => {
    api.me().then((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  function handleLogout() {
    if (user) clearUser(user.sub);
    setUser(null);
  }

  return (
    <ThemeProvider>
      <ColorThemeProvider>
        {!ready ? (
          <div className="os-wallpaper grid h-full w-full place-items-center">
            <div className="text-sm text-muted-foreground">Carregando…</div>
          </div>
        ) : user ? (
          <UserSubProvider sub={user.sub}>
            <NotificationsProvider>
              {shell === "mobile" ? (
                <MobileShell user={user} onLogout={handleLogout} />
              ) : shell === "workspace" ? (
                <WorkspaceShell user={user} onLogout={handleLogout} />
              ) : (
                <WindowsProvider>
                  <Desktop user={user} onLogout={handleLogout} />
                </WindowsProvider>
              )}
            </NotificationsProvider>
          </UserSubProvider>
        ) : (
          <LockScreen onLogin={setUser} />
        )}
      </ColorThemeProvider>
    </ThemeProvider>
  );
}

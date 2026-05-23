import { Bell, LogOut, Moon, Sun, ChevronDown, MonitorCog, Palette, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { ClockLabel } from "./Clock";
import { useTheme, type ThemeMode } from "../lib/theme";
import { useNotifications } from "../lib/notifications";
import { useWindows } from "../lib/windows";
import { useApps } from "../lib/use-apps";
import type { User } from "../lib/api";

interface Props {
  user: User;
  onLogout: () => void;
  onOpenNotifications: () => void;
}

export function TopBar({ user, onLogout, onOpenNotifications }: Props) {
  const { mode, resolvedTheme, setMode } = useTheme();
  const { unread } = useNotifications();
  const { openNew } = useWindows();
  const { apps } = useApps();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  useEffect(() => {
    function onClick() {
      setUserMenuOpen(false);
      setThemeMenuOpen(false);
    }
    if (userMenuOpen || themeMenuOpen) {
      window.addEventListener("click", onClick);
      return () => window.removeEventListener("click", onClick);
    }
  }, [userMenuOpen, themeMenuOpen]);

  function openSettings(initialPath?: string) {
    const sistema = apps.find((a) => a.id === "sistema");
    if (!sistema) return;
    openNew(sistema, initialPath);
  }

  return (
    <header
      className="os-glass absolute top-2 right-2 left-2 z-[9999] flex h-9 items-center justify-between rounded-full px-3 text-xs"
      style={{ height: 36 }}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="font-semibold text-foreground">Processa OS</span>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 text-muted-foreground">
        <ClockLabel />
      </div>
      <div className="flex items-center gap-1">
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setThemeMenuOpen((o) => !o);
              setUserMenuOpen(false);
            }}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Tema"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {themeMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="os-glass absolute top-full right-0 z-[10000] mt-2 w-44 rounded-xl p-1 text-sm shadow-xl"
            >
              <ThemeMenuItem
                Icon={Sun}
                label="Claro"
                selected={mode === "light"}
                onClick={() => {
                  setMode("light");
                  setThemeMenuOpen(false);
                }}
              />
              <ThemeMenuItem
                Icon={Moon}
                label="Escuro"
                selected={mode === "dark"}
                onClick={() => {
                  setMode("dark");
                  setThemeMenuOpen(false);
                }}
              />
              <ThemeMenuItem
                Icon={MonitorCog}
                label="Sistema"
                selected={mode === "system"}
                onClick={() => {
                  setMode("system");
                  setThemeMenuOpen(false);
                }}
              />
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  setThemeMenuOpen(false);
                  openSettings("/aparencia");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
              >
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span>Personalizar…</span>
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUserMenuOpen((o) => !o);
              setThemeMenuOpen(false);
            }}
            className="ml-1 flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-accent"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {user.avatar}
            </span>
            <span className="text-foreground">{user.name}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {userMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="os-glass absolute top-full right-0 z-[10000] mt-2 w-48 rounded-xl p-1 text-sm shadow-xl"
            >
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Conectado como
                <div className="text-sm font-medium text-foreground">{user.name}</div>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ThemeMenuItem({
  Icon,
  label,
  selected,
  onClick,
}: {
  Icon: typeof Sun;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent ${
        selected ? "text-primary" : ""
      }`}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {selected && <Check className="h-3 w-3" />}
    </button>
  );
}

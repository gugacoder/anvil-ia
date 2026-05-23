// =============================================================================
// WorkspaceShell — segundo layout desktop (alternativa ao Desktop OS-like).
//
// Anatomia:
//   - Sidebar vertical retratil (240px expandida / 56px retraida)
//     - Topo: brand
//     - Meio: lista de apps (item ativo destacado)
//     - Base: avatar + menu (popover ao clicar)
//   - Area central
//     - Topo: breadcrumb (esquerda) + acoes globais (direita: busca, sino, tema)
//     - Centro: conteudo do app em uso (preenche todo o espaco)
//
// Um app por vez. Sem janelas, sem dock, sem icones na area de trabalho.
// Estado de cada app preservado em memoria entre trocas (renderiza todos
// como camadas, so o ativo visivel — mesmo padrao do MobileAppRuntime).
// =============================================================================

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Menu,
  ChevronDown,
  Search,
  Bell,
  Sun,
  Moon,
  MonitorCog,
  Settings as SettingsIcon,
  LogOut,
  Check,
} from "lucide-react";
import { useApps } from "../../lib/use-apps";
import { useNotifications } from "../../lib/notifications";
import { useTheme, type ThemeMode } from "../../lib/theme";
import { useWorkspaceState, WorkspaceStateProvider } from "../../lib/workspace-state";
import { api, type User } from "../../lib/api";
import type { AppDef } from "../../apps/registry";
import { NotificationCenter, ToastStack } from "../NotificationCenter";

interface Props {
  user: User;
  onLogout: () => void;
}

export function WorkspaceShell({ user, onLogout }: Props) {
  return (
    <WorkspaceStateProvider>
      <WorkspaceShellInner user={user} onLogout={onLogout} />
    </WorkspaceStateProvider>
  );
}

function WorkspaceShellInner({ user, onLogout }: Props) {
  const { apps, loading, error } = useApps();
  const { sidebarCollapsed, toggleSidebar, hydrate } = useWorkspaceState();

  async function logout() {
    await api.logout();
    onLogout();
  }

  // Hidrata a lista de apps abertos a partir do storage assim que o registry chega.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!apps.length) return;
    hydratedRef.current = true;
    hydrate(apps);
  }, [apps, hydrate]);

  // Auto-launch primeiro app quando registry termina de carregar e nada esta aberto
  const { currentId, launchApp, open } = useWorkspaceState();
  const autoLaunched = useRef(false);
  useEffect(() => {
    if (autoLaunched.current) return;
    if (!apps.length) return;
    if (!hydratedRef.current) return;
    if (currentId || open.length) {
      autoLaunched.current = true;
      return;
    }
    autoLaunched.current = true;
    launchApp(apps[0]);
  }, [apps, currentId, launchApp, open.length]);

  return (
    <div className="os-wallpaper flex h-full w-full overflow-hidden">
      <Sidebar
        apps={apps}
        user={user}
        onLogout={logout}
        collapsed={sidebarCollapsed}
        loading={loading}
        error={error}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Breadcrumb onToggleSidebar={toggleSidebar} />
        <main className="min-h-0 flex-1 overflow-auto bg-background">
          <AppArea apps={apps} />
        </main>
      </div>
      <ToastStack />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sidebar
// -----------------------------------------------------------------------------
function Sidebar({
  apps,
  user,
  onLogout,
  collapsed,
  loading,
  error,
}: {
  apps: AppDef[];
  user: User;
  onLogout: () => void;
  collapsed: boolean;
  loading: boolean;
  error: string | null;
}) {
  return (
    <aside
      className="os-glass-strong flex shrink-0 flex-col border-r border-border/60 transition-[width] duration-200 ease-in-out"
      style={{ width: collapsed ? 56 : 240 }}
    >
      <Brand collapsed={collapsed} />
      <div className="my-1 mx-2 h-px bg-border/40" />
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto px-2 py-2">
        {loading && (
          <div className="px-2 py-1 text-xs text-muted-foreground">{collapsed ? "…" : "Carregando…"}</div>
        )}
        {error && (
          <div className="px-2 py-1 text-xs text-rose-400">{collapsed ? "!" : `Falha: ${error}`}</div>
        )}
        {apps.map((app) => (
          <SidebarAppItem key={app.id} app={app} collapsed={collapsed} />
        ))}
      </nav>
      <div className="my-1 mx-2 h-px bg-border/40" />
      <UserMenuTrigger user={user} onLogout={onLogout} collapsed={collapsed} />
    </aside>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-12 items-center gap-2 px-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
        OS
      </span>
      {!collapsed && (
        <span className="truncate text-sm font-semibold text-foreground">Processa OS</span>
      )}
    </div>
  );
}

function SidebarAppItem({ app, collapsed }: { app: AppDef; collapsed: boolean }) {
  const { currentId, launchApp } = useWorkspaceState();
  const active = currentId === app.id;
  const Icon = app.Icon;
  return (
    <button
      type="button"
      onClick={() => launchApp(app)}
      title={app.label}
      className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
        active
          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
          : "text-foreground hover:bg-card/60"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} />
      {!collapsed && <span className="truncate">{app.label}</span>}
      {active && !collapsed && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
    </button>
  );
}

function UserMenuTrigger({
  user,
  onLogout,
  collapsed,
}: {
  user: User;
  onLogout: () => void;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  useOutsideClose(open, () => setOpen(false));
  return (
    <div className="relative p-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title={user.name}
        className={`flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-sm transition-colors hover:bg-card/60 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {user.avatar}
        </span>
        {!collapsed && (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
              <span className="truncate text-[10px] text-muted-foreground">@{user.sub}</span>
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </>
        )}
      </button>
      {open && (
        <UserMenu
          user={user}
          collapsed={collapsed}
          onClose={() => setOpen(false)}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}

function UserMenu({
  user,
  collapsed,
  onClose,
  onLogout,
}: {
  user: User;
  collapsed: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const { mode, setMode } = useTheme();
  const { apps } = useApps();
  const { launchApp } = useWorkspaceState();

  function openSettings() {
    const settings = apps.find((a) => a.id === "sistema");
    if (settings) launchApp(settings);
    onClose();
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="os-glass-strong absolute bottom-full left-2 z-[10000] mb-2 w-64 rounded-xl p-1 text-sm shadow-2xl"
      style={collapsed ? { left: "calc(100% + 8px)", bottom: "auto", top: 8 } : undefined}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {user.avatar}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{user.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">@{user.sub}</div>
        </div>
      </div>
      <div className="my-1 h-px bg-border" />
      <button
        type="button"
        onClick={openSettings}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
      >
        <SettingsIcon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">Configurações</span>
      </button>
      <ThemeSubMenu mode={mode} setMode={setMode} />
      <div className="my-1 h-px bg-border" />
      <button
        type="button"
        onClick={() => {
          onClose();
          onLogout();
        }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
      >
        <LogOut className="h-4 w-4 text-muted-foreground" />
        <span>Sair</span>
      </button>
    </div>
  );
}

function ThemeSubMenu({
  mode,
  setMode,
}: {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}) {
  const options: Array<{ key: ThemeMode; label: string; Icon: typeof Sun }> = [
    { key: "light", label: "Claro", Icon: Sun },
    { key: "dark", label: "Escuro", Icon: Moon },
    { key: "system", label: "Sistema", Icon: MonitorCog },
  ];
  return (
    <div className="px-1">
      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        Tema
      </div>
      {options.map((o) => {
        const active = mode === o.key;
        const Icon = o.Icon;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setMode(o.key)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm hover:bg-accent ${
              active ? "text-primary" : ""
            }`}
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{o.label}</span>
            {active && <Check className="h-3 w-3" />}
          </button>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Breadcrumb (topo da area central)
// -----------------------------------------------------------------------------
function Breadcrumb({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { currentId, open } = useWorkspaceState();
  const current = open.find((o) => o.appId === currentId);
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-card/40 px-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 hover:bg-card/80"
          title="Retrair sidebar"
          aria-label="Retrair sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="hover:text-foreground hover:cursor-default">Início</span>
        {current && (
          <>
            <span className="opacity-50">/</span>
            <span className="font-medium text-foreground">{current.app.label}</span>
          </>
        )}
      </div>
      <RightActions />
    </header>
  );
}

function RightActions() {
  const { toggle, resolvedTheme } = useTheme();
  const { unread } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <div className="flex items-center gap-1">
      {!searchOpen ? (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-card/80 hover:text-foreground"
          title="Buscar"
          aria-label="Buscar"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <SearchField onClose={() => setSearchOpen(false)} />
      )}
      <button
        type="button"
        onClick={() => setNotifOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-muted-foreground hover:bg-card/80 hover:text-foreground"
        title="Notificações"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={toggle}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-card/80 hover:text-foreground"
        title="Alternar tema"
        aria-label="Alternar tema"
      >
        {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}

function SearchField({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState("");
  const { apps } = useApps();
  const { launchApp } = useWorkspaceState();
  const filtered = apps.filter((a) => a.label.toLowerCase().includes(value.toLowerCase()));
  return (
    <div className="relative">
      <input
        type="search"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (!value) onClose();
        }}
        placeholder="Buscar apps…"
        className="h-8 w-56 rounded-md bg-card/70 px-2 text-sm outline-none ring-1 ring-border/40 focus:ring-primary/50"
      />
      {value && filtered.length > 0 && (
        <ul className="os-glass-strong absolute top-full right-0 z-[10000] mt-1 w-56 rounded-md p-1 shadow-xl">
          {filtered.slice(0, 8).map((app) => {
            const Icon = app.Icon;
            return (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={() => {
                    launchApp(app);
                    setValue("");
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{app.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Area central — renderiza apps em camadas (so o ativo visivel) pra preservar
// estado entre trocas
// -----------------------------------------------------------------------------
function AppArea({ apps }: { apps: AppDef[] }): ReactNode {
  const { open, currentId } = useWorkspaceState();
  if (!apps.length) return null;
  return (
    <div className="relative h-full w-full">
      {open.map((o) => {
        const visible = o.appId === currentId;
        return (
          <div
            key={o.appId}
            className={`absolute inset-0 ${visible ? "z-10 visible" : "invisible -z-10"} overflow-auto`}
            aria-hidden={!visible}
          >
            {o.app.render({
              instanceId: o.appId,
              initialPath: o.app.defaultPath ?? "/",
              formFactor: "desktop",
            })}
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Util: fecha popover/menu ao clicar fora
// -----------------------------------------------------------------------------
function useOutsideClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    function handler() {
      onClose();
    }
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [open, onClose]);
}

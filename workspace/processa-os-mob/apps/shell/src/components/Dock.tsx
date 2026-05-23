import { useEffect, useState } from "react";
import type { AppDef } from "../apps/registry";
import { useWindows, type WinState } from "../lib/windows";

interface Props {
  apps: AppDef[];
  onLaunch: (a: AppDef) => void;
}

interface MenuState {
  appId: string;
  anchor: { x: number; y: number };
}

export function Dock({ apps, onLaunch }: Props) {
  const { windows, focus, activeId, openNew, closeAll, close } = useWindows();
  const [menu, setMenu] = useState<MenuState | null>(null);

  // grupo de janelas por appId, mais recente primeiro
  const groupOf = (appId: string) =>
    windows.filter((w) => w.appId === appId).sort((a, b) => b.z - a.z);

  const fixedIds = new Set(apps.map((a) => a.id));
  const orphanGroups = new Map<string, WinState[]>();
  for (const w of windows) {
    if (fixedIds.has(w.appId)) continue;
    const list = orphanGroups.get(w.appId) ?? [];
    list.push(w);
    orphanGroups.set(w.appId, list);
  }

  useEffect(() => {
    if (!menu) return;
    function onClick() {
      setMenu(null);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [menu]);

  function handleClick(app: AppDef) {
    const group = groupOf(app.id);
    if (group.length === 0) {
      onLaunch(app);
      return;
    }
    focus(group[0].id);
  }

  function handleContext(e: React.MouseEvent, app: AppDef) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ appId: app.id, anchor: { x: e.clientX, y: e.clientY } });
  }

  return (
    <div className="pointer-events-none absolute right-0 bottom-3 left-0 z-[9999] flex justify-center">
      <div className="os-glass pointer-events-auto flex items-end gap-1 rounded-2xl p-2">
        {apps.map((app) => {
          const group = groupOf(app.id);
          const running = group.length;
          const focused = running > 0 && group[0].id === activeId && !group[0].minimized;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => handleClick(app)}
              onContextMenu={(e) => handleContext(e, app)}
              className={`group relative grid h-12 w-12 place-items-center rounded-xl transition ${
                focused ? "bg-primary/20 text-primary" : "text-foreground hover:bg-white/10"
              }`}
              title={app.label}
            >
              <app.Icon className="h-5 w-5" />
              <StackIndicator count={running} focused={focused} />
            </button>
          );
        })}
        {Array.from(orphanGroups.entries()).map(([appId, group]) => {
          const first = group[0];
          const focused = group.some((w) => w.id === activeId && !w.minimized);
          return (
            <button
              key={appId}
              type="button"
              onClick={() => focus(group.sort((a, b) => b.z - a.z)[0].id)}
              onContextMenu={(e) => handleContext(e, first.app)}
              className={`relative grid h-12 w-12 place-items-center rounded-xl text-xs ${
                focused ? "bg-primary/20 text-primary" : "hover:bg-white/10"
              }`}
              title={first.title}
            >
              {first.app.Icon ? <first.app.Icon className="h-5 w-5" /> : null}
              <StackIndicator count={group.length} focused={focused} />
            </button>
          );
        })}
      </div>

      {menu && (
        <DockMenu
          key={menu.appId}
          appId={menu.appId}
          anchor={menu.anchor}
          windows={groupOf(menu.appId)}
          app={
            apps.find((a) => a.id === menu.appId) ??
            windows.find((w) => w.appId === menu.appId)?.app ??
            null
          }
          onClose={() => setMenu(null)}
          onNew={(app) => {
            setMenu(null);
            openNew(app);
          }}
          onFocus={(id) => {
            setMenu(null);
            focus(id);
          }}
          onClose1={(id) => {
            setMenu(null);
            close(id);
          }}
          onCloseAll={(appId) => {
            setMenu(null);
            closeAll(appId);
          }}
        />
      )}
    </div>
  );
}

function StackIndicator({ count, focused }: { count: number; focused: boolean }) {
  if (count <= 0) return null;
  const dots = Math.min(count, 3);
  return (
    <span className="absolute -bottom-1 flex items-center gap-0.5">
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={`h-1 w-1.5 rounded-full ${
            focused ? "bg-primary" : "bg-muted-foreground/70"
          }`}
        />
      ))}
    </span>
  );
}

interface DockMenuProps {
  appId: string;
  anchor: { x: number; y: number };
  windows: WinState[];
  app: AppDef | null;
  onClose: () => void;
  onNew: (app: AppDef) => void;
  onFocus: (winId: string) => void;
  onClose1: (winId: string) => void;
  onCloseAll: (appId: string) => void;
}

function DockMenu({
  appId,
  anchor,
  windows,
  app,
  onNew,
  onFocus,
  onClose1,
  onCloseAll,
}: DockMenuProps) {
  if (!app) return null;
  const isMulti = !!app.multi;
  // posiciona acima do cursor, mas dentro da viewport
  const width = 240;
  const x = Math.max(8, Math.min(anchor.x - width / 2, window.innerWidth - width - 8));
  const y = Math.max(8, anchor.y - 8);
  return (
    <div
      role="menu"
      className="os-glass pointer-events-auto fixed z-[10000] w-60 -translate-y-full rounded-xl p-1 text-sm shadow-2xl"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isMulti && (
        <>
          <button
            type="button"
            onClick={() => onNew(app)}
            className="flex w-full items-center rounded-lg px-3 py-1.5 text-left hover:bg-accent"
          >
            Nova janela
          </button>
          <div className="my-1 h-px bg-border" />
        </>
      )}
      {windows.length > 0 ? (
        <>
          <div className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Janelas abertas
          </div>
          {windows.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-1 rounded-lg pl-1 hover:bg-accent"
            >
              <button
                type="button"
                onClick={() => onFocus(w.id)}
                className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span className="truncate">{w.title}</span>
              </button>
              <button
                type="button"
                onClick={() => onClose1(w.id)}
                title="Fechar esta janela"
                className="rounded-md p-1 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-500"
              >
                <CloseX />
              </button>
            </div>
          ))}
          {windows.length >= 2 && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => onCloseAll(appId)}
                className="flex w-full items-center rounded-lg px-3 py-1.5 text-left text-rose-500 hover:bg-accent"
              >
                Fechar todas
              </button>
            </>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => onNew(app)}
          className="flex w-full items-center rounded-lg px-3 py-1.5 text-left hover:bg-accent"
        >
          Abrir
        </button>
      )}
    </div>
  );
}

function CloseX() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}

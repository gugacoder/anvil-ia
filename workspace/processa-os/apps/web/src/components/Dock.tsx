import type { AppDef } from "../apps/registry";
import { useWindows } from "../lib/windows";

interface Props {
  apps: AppDef[];
  onLaunch: (a: AppDef) => void;
}

export function Dock({ apps, onLaunch }: Props) {
  const { windows, focus, activeId } = useWindows();

  const runningAppIds = new Set(windows.map((w) => w.appId));
  // mostra apps fixados + qualquer running que nao esteja fixado
  const fixedIds = new Set(apps.map((a) => a.id));
  const orphanWins = windows.filter((w) => !fixedIds.has(w.appId));

  return (
    <div className="pointer-events-none absolute right-0 bottom-3 left-0 z-[5] flex justify-center">
      <div className="os-glass pointer-events-auto flex items-end gap-1 rounded-2xl p-2">
        {apps.map((app) => {
          const win = windows.find((w) => w.appId === app.id);
          const running = !!win;
          const active = win?.id === activeId && !win?.minimized;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => (win ? focus(win.id) : onLaunch(app))}
              className={`group relative grid h-12 w-12 place-items-center rounded-xl transition ${
                active
                  ? "bg-primary/20 text-primary"
                  : "text-foreground hover:bg-white/10"
              }`}
              title={app.label}
            >
              <app.Icon className="h-5 w-5" />
              {running && (
                <span
                  className={`absolute -bottom-1 h-1 w-1.5 rounded-full ${
                    active ? "bg-primary" : "bg-muted-foreground/70"
                  }`}
                />
              )}
            </button>
          );
        })}
        {orphanWins.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => focus(w.id)}
            className={`grid h-12 w-12 place-items-center rounded-xl text-xs ${
              w.id === activeId ? "bg-primary/20 text-primary" : "hover:bg-white/10"
            }`}
            title={w.title}
          >
            {w.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

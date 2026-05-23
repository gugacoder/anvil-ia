import type { AppDef } from "../apps/registry";

export function DesktopIcons({
  apps,
  onLaunch,
}: {
  apps: AppDef[];
  onLaunch: (a: AppDef) => void;
}) {
  return (
    <div className="absolute top-14 left-4 z-[2] grid grid-cols-1 gap-3">
      {apps.map((app) => (
        <button
          key={app.id}
          type="button"
          onDoubleClick={() => onLaunch(app)}
          onClick={() => onLaunch(app)}
          className="group flex w-20 flex-col items-center gap-1.5 rounded-lg p-2 text-center transition hover:bg-black/5 focus:bg-black/10 dark:hover:bg-white/10 dark:focus:bg-white/15"
          title={app.label}
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-card/70 text-primary shadow-sm backdrop-blur transition group-hover:scale-105">
            <app.Icon className="h-6 w-6" />
          </span>
          <span className="line-clamp-2 text-[11px] font-medium text-slate-900 [text-shadow:0_1px_2px_rgba(255,255,255,0.6)] dark:text-white dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">
            {app.label}
          </span>
        </button>
      ))}
    </div>
  );
}

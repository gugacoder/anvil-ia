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
          className="group flex w-20 flex-col items-center gap-1.5 rounded-lg p-2 text-center transition hover:bg-white/10 focus:bg-white/15"
          title={app.label}
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-card/70 text-primary shadow-sm backdrop-blur transition group-hover:scale-105">
            <app.Icon className="h-6 w-6" />
          </span>
          <span className="line-clamp-2 text-[11px] font-medium text-white drop-shadow">
            {app.label}
          </span>
        </button>
      ))}
    </div>
  );
}

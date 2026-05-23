import type { AppDef } from "../apps/registry";
import { HomeAppIcon } from "./HomeAppIcon";

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
        <HomeAppIcon
          key={app.id}
          app={app}
          size="md"
          onClick={() => onLaunch(app)}
          onDoubleClick={() => onLaunch(app)}
        />
      ))}
    </div>
  );
}

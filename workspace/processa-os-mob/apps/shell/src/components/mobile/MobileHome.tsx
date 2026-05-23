// =============================================================================
// MobileHome — home screen iOS-style. Wallpaper + relogio (lock-screen-like)
// + grid de todos os apps. Tap = abre app fullscreen. Mantem padrao iOS:
// app no grid e/ou no dock; dock e' atalho rapido, grid e' descoberta.
// =============================================================================

import { motion } from "framer-motion";
import { useMobState } from "../../lib/mob-state";
import { useApps } from "../../lib/use-apps";
import { useNow } from "../Clock";
import type { AppDef } from "../../apps/registry";
import { haptic } from "../../lib/haptics";

export function MobileHome() {
  const { foregroundId, switcherOpen, launchApp } = useMobState();
  const { apps } = useApps();
  const hidden = !!foregroundId || switcherOpen;
  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-start pt-safe ${
        hidden ? "pointer-events-none" : ""
      }`}
      style={{ paddingBottom: "calc(var(--sa-bottom) + var(--dock-h, 76px) + 16px)" }}
    >
      <div className="h-8 shrink-0" />
      <HomeClockWidget />
      <AppGrid
        apps={apps}
        onLaunch={(app) => {
          haptic("light");
          launchApp(app);
        }}
      />
    </div>
  );
}

function HomeClockWidget() {
  const now = useNow(15_000);
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center pt-8 text-white drop-shadow"
    >
      <span className="text-6xl font-light tracking-tight tabular-nums">{time}</span>
      <span className="mt-1 text-sm capitalize opacity-80">{date}</span>
    </motion.div>
  );
}

function AppGrid({ apps, onLaunch }: { apps: AppDef[]; onLaunch: (a: AppDef) => void }) {
  if (!apps.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-10 grid w-full max-w-md grid-cols-4 gap-x-4 gap-y-6 px-5"
    >
      {apps.map((app) => (
        <button
          key={app.id}
          type="button"
          onClick={() => onLaunch(app)}
          className="group flex flex-col items-center gap-1.5 rounded-2xl p-1 transition-transform active:scale-90"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-foreground/12 ring-1 ring-foreground/15 shadow-md backdrop-blur-md">
            <app.Icon className="h-7 w-7 text-white" strokeWidth={1.9} />
          </span>
          <span className="line-clamp-2 text-center text-[11px] font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
            {app.label}
          </span>
        </button>
      ))}
    </motion.div>
  );
}

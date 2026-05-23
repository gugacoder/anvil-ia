// =============================================================================
// MobileDock — barra fixa no rodape. 4 atalhos do usuario + 1 botao Menu que
// abre o App Drawer (todos os apps). Sempre on top: renderizada acima do app
// runtime, do switcher e da home — so a shade passa por cima dela.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Grip } from "lucide-react";
import type { AppDef } from "../../apps/registry";
import { useMobState } from "../../lib/mob-state";
import { useMobileAppStatus } from "../../lib/use-app-status";
import { useLongPress } from "../../lib/use-long-press";
import { haptic } from "../../lib/haptics";
import { AppStatusIndicator } from "../AppStatusIndicator";

const DOCK_KEY = "mob.dock.v1";
const DOCK_SIZE = 4;

export function MobileDock({ apps }: { apps: AppDef[] }) {
  const { launchApp, openDrawer, closeDrawer, drawerOpen, shadeOpen, goHome } =
    useMobState();
  const { status: appStatus } = useMobileAppStatus();
  const [dock, setDock] = useState<string[]>([]);
  // Long-press no botao Menu = vai pra area de trabalho (esconde o app aberto).
  // suppressTap evita disparar o toggle do drawer no release apos o long-press.
  const suppressTap = useRef(false);
  const longPress = useLongPress(() => {
    suppressTap.current = true;
    haptic("medium");
    goHome();
  }, 520);

  useEffect(() => {
    if (!apps.length) return;
    const slugs = apps.map((a) => a.id);
    function load() {
      const saved = readSaved(DOCK_KEY, slugs.slice(0, DOCK_SIZE));
      setDock(saved.filter((s) => slugs.includes(s)).slice(0, DOCK_SIZE));
    }
    load();
    // O drawer (modo editar) altera o dock — escutamos o evento pra refletir
    function onChange() {
      load();
    }
    window.addEventListener("mob:dock-changed", onChange);
    return () => window.removeEventListener("mob:dock-changed", onChange);
  }, [apps]);

  const byId = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);

  // Esconde sob a shade (a shade cobre tudo de cima). Mantem visivel sob app/switcher.
  if (shadeOpen) return null;

  return (
    <div
      className="os-glass-strong fixed inset-x-0 bottom-0 z-[55] border-t border-white/10"
      style={{ paddingBottom: "max(8px, var(--sa-bottom))" }}
    >
      <div className="flex items-center justify-around gap-1 px-3 pt-2 pb-1">
        {dock.map((slug) => {
          const app = byId.get(slug);
          if (!app) return null;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => {
                haptic("light");
                launchApp(app);
              }}
              className="relative rounded-2xl p-1 transition-transform active:scale-90"
            >
              <DockIconVisual app={app} />
              <AppStatusIndicator status={appStatus.get(app.id)} />
            </button>
          );
        })}
        {/* Separador discreto isolando o slot do menu */}
        <span aria-hidden className="mx-1 h-8 w-px shrink-0 bg-foreground/15" />
        <button
          type="button"
          onClick={() => {
            if (suppressTap.current) {
              suppressTap.current = false;
              return;
            }
            haptic("light");
            if (drawerOpen) closeDrawer();
            else openDrawer();
          }}
          {...longPress}
          className={`rounded-2xl p-1 transition-transform active:scale-90 ${
            drawerOpen ? "ring-2 ring-primary/50" : ""
          }`}
          aria-label="Menu de apps (mantenha pressionado para ir para a area de trabalho)"
        >
          <MenuIconVisual active={drawerOpen} />
        </button>
      </div>
    </div>
  );
}

function DockIconVisual({ app }: { app: AppDef }) {
  const Icon = app.Icon;
  return (
    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-foreground/8 ring-1 ring-foreground/12 shadow-sm backdrop-blur">
      <Icon className="h-6 w-6 text-foreground" strokeWidth={1.9} />
    </span>
  );
}

function MenuIconVisual({ active }: { active: boolean }) {
  return (
    <span
      className={`grid h-12 w-12 place-items-center rounded-2xl shadow-sm backdrop-blur transition-colors ${
        active
          ? "bg-primary/20 ring-1 ring-primary/40"
          : "bg-foreground/8 ring-1 ring-foreground/12"
      }`}
    >
      <Grip
        className={`h-6 w-6 ${active ? "text-primary" : "text-foreground"}`}
        strokeWidth={1.9}
      />
    </span>
  );
}

function readSaved(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

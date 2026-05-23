// =============================================================================
// HomeAppIcon — icone de app na home/area de trabalho. Compartilhado entre
// desktop e mobile. Mantem o look "glass" do mobile (que ficou perfeito) e
// expoe `size` pra ajustar densidade por form-factor:
//   - md (48px): desktop
//   - lg (56px): mobile
// Texto e icone usam text-foreground com text-shadow adaptativo dark/light,
// pra ler bem sobre qualquer wallpaper em qualquer modo.
//
// Aceita `status` opcional pra indicar foreground/background do app (mostra
// linha ou bolinha abaixo do ícone).
// =============================================================================

import type { ComponentType } from "react";
import type { AppStatus } from "../lib/use-app-status";
import { AppStatusIndicator } from "./AppStatusIndicator";

interface AppLike {
  id: string;
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface Props {
  app: AppLike;
  size?: "md" | "lg";
  status?: AppStatus;
  onClick: () => void;
  onDoubleClick?: () => void;
}

export function HomeAppIcon({ app, size = "lg", status, onClick, onDoubleClick }: Props) {
  const Icon = app.Icon;
  const tile = size === "lg" ? "h-14 w-14" : "h-12 w-12";
  const icon = size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={app.label}
      className="group flex flex-col items-center gap-1.5 rounded-2xl p-1 transition-transform hover:scale-105 active:scale-90"
    >
      <span
        className={`relative grid ${tile} place-items-center rounded-2xl bg-foreground/12 ring-1 ring-foreground/15 shadow-md backdrop-blur-md`}
      >
        <Icon className={`${icon} text-foreground`} strokeWidth={1.9} />
        <AppStatusIndicator status={status} />
      </span>
      <span className="line-clamp-2 max-w-[80px] text-center text-[11px] font-medium text-foreground [text-shadow:0_1px_2px_rgba(255,255,255,0.7)] dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
        {app.label}
      </span>
    </button>
  );
}

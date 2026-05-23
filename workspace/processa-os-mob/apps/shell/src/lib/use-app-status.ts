// =============================================================================
// useAppStatus — fonte única de "qual é o status de cada app" pros indicadores
// visuais (linha = foreground, bolinha = background, nada = fechado).
//
// Os três shells têm sources distintas; este hook detecta qual provider está
// disponível e devolve um Map<appId, AppStatus>.
// =============================================================================

import { useContext } from "react";
import { useMobState } from "./mob-state";
import { useWindows } from "./windows";
import { useWorkspaceState } from "./workspace-state";

export type AppStatus = "foreground" | "background";

interface Result {
  /** Lookup por appId. Apps fechados não estão no map. */
  status: Map<string, AppStatus>;
}

function safeUse<T>(hook: () => T): T | null {
  try {
    return hook();
  } catch {
    return null;
  }
}

/** Mobile shell. */
export function useMobileAppStatus(): Result {
  const { open, foregroundId } = useMobState();
  const status = new Map<string, AppStatus>();
  for (const o of open) {
    status.set(o.appId, o.appId === foregroundId ? "foreground" : "background");
  }
  return { status };
}

/** Workspace shell. */
export function useWorkspaceAppStatus(): Result {
  const { open, currentId } = useWorkspaceState();
  const status = new Map<string, AppStatus>();
  for (const o of open) {
    status.set(o.appId, o.appId === currentId ? "foreground" : "background");
  }
  return { status };
}

/** Windowed shell (desktop). Agrega múltiplas janelas do mesmo app. */
export function useWindowedAppStatus(): Result {
  const { windows, activeId } = useWindows();
  const status = new Map<string, AppStatus>();
  for (const w of windows) {
    const isForeground = w.id === activeId && !w.minimized;
    const prev = status.get(w.appId);
    if (isForeground) {
      status.set(w.appId, "foreground");
    } else if (prev !== "foreground") {
      status.set(w.appId, "background");
    }
  }
  return { status };
}

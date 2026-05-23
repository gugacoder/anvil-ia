// =============================================================================
// pos-runtime — contrato global exposto em `window.__pos` para que apps
// federados consigam reter estado seguindo a mesma convenção de chave do
// shell (pos:state:<sub>:<scope>:<key>). Apps federados são bundles
// independentes — não importam de `apps/shell` — então o ponte é runtime.
//
// Apps federados DEVEM ler `window.__pos` apenas; nunca escrever.
// =============================================================================

import { useSyncExternalStore } from "react";

export interface PosRuntime {
  /** sub do usuário logado. null quando não há sessão. */
  sub: string | null;
}

declare global {
  interface Window {
    __pos?: PosRuntime;
  }
}

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setPosRuntime(sub: string | null) {
  if (typeof window === "undefined") return;
  window.__pos = { sub };
  emit();
}

export function getPosRuntime(): PosRuntime {
  return window.__pos ?? { sub: null };
}

/** Hook que reflete o `sub` corrente. Federados podem usar pra reagir a logout. */
export function usePosSub(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getPosRuntime().sub,
    () => null,
  );
}

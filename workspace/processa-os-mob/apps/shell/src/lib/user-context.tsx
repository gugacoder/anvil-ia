// =============================================================================
// UserContext — disponibiliza o `sub` do usuário logado para qualquer provider
// que precise namespacar storage (mob-state, windows, useAppStorage).
// =============================================================================

import { createContext, useContext, type ReactNode } from "react";

const Ctx = createContext<string | null>(null);

export function UserSubProvider({ sub, children }: { sub: string; children: ReactNode }) {
  return <Ctx.Provider value={sub}>{children}</Ctx.Provider>;
}

/** Retorna o `sub` do usuário atual. Garante presença — só chame dentro da árvore autenticada. */
export function useUserSub(): string {
  const sub = useContext(Ctx);
  if (!sub) throw new Error("UserSubProvider missing");
  return sub;
}

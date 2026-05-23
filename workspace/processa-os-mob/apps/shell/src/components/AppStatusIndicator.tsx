// =============================================================================
// AppStatusIndicator — fragmento visual reaproveitado pelos pontos onde o
// ícone de app aparece (home, drawer, dock mobile, dock/sidebar desktop, lens).
//
// Estados:
//   - foreground : linha curta primary (app ativo agora)
//   - background : bolinha cheia muted-foreground (app vivo em 2º plano)
//   - undefined  : nada
//
// Posicionado absolutamente — pai precisa de `relative`.
// =============================================================================

import type { AppStatus } from "../lib/use-app-status";

export function AppStatusIndicator({ status }: { status: AppStatus | undefined }) {
  if (!status) return null;
  if (status === "foreground") {
    return (
      <span
        aria-hidden
        className="absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-primary"
      />
    );
  }
  // background
  return (
    <span
      aria-hidden
      className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-muted-foreground"
    />
  );
}

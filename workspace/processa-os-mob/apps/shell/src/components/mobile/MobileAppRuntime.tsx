// =============================================================================
// MobileAppRuntime — renderiza o app em foreground fullscreen. Reaproveita o
// render() do AppDef (mesmo dos apps no desktop), envolto em wrapper mobile.
// =============================================================================

import { useMobState } from "../../lib/mob-state";
import type { AppInstanceProps } from "../../apps/registry";

export function MobileAppRuntime() {
  const { open, foregroundId } = useMobState();
  // Renderiza TODOS os apps abertos como camadas; so o foreground fica visivel.
  // Isso preserva o estado dos apps em background (importante pro switcher).
  // No mobile, multi-instância é IGNORADO — sempre singleton por appId.
  return (
    <div className="relative h-full w-full bg-background">
      {open.map((o) => {
        const isFg = o.appId === foregroundId;
        const props: AppInstanceProps = {
          instanceId: o.appId,
          initialPath: o.app.defaultPath ?? "/",
          formFactor: "mobile",
        };
        return (
          <div
            key={o.appId}
            className={`absolute inset-0 ${
              isFg ? "z-10 visible" : "invisible -z-10"
            } overflow-hidden`}
            aria-hidden={!isFg}
          >
            <AppHeader title={o.app.label} />
            <div
              className="absolute inset-x-0 bottom-0 overflow-auto"
              style={{ top: "calc(40px + var(--sa-top))" }}
            >
              {o.app.render(props)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AppHeader({ title }: { title: string }) {
  return (
    <div
      className="absolute inset-x-0 top-0 z-10 flex items-end justify-center bg-card/60 px-3 pb-1.5 backdrop-blur-md"
      style={{ height: "calc(40px + var(--sa-top))", paddingTop: "var(--sa-top)" }}
    >
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}

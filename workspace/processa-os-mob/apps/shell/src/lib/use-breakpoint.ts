// =============================================================================
// Breakpoints. Decisao 100% por viewport — sem localStorage, sem query string,
// sem heuristica de pointer/standalone. Reage a resize/orientation em tempo
// real via matchMedia.
//
// Limites (largura em px):
//   mobile   :  <  768
//   tablet   : 768 – 1023
//   desktop  : 1024 – 1919
//   tv       :  >= 1920
// =============================================================================

import { useSyncExternalStore } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop" | "tv";

const QUERIES = {
  mobile: "(max-width: 767px)",
  tablet: "(min-width: 768px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px) and (max-width: 1919px)",
  tv: "(min-width: 1920px)",
} as const;

function detect(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  for (const bp of ["mobile", "tablet", "desktop", "tv"] as const) {
    if (window.matchMedia(QUERIES[bp]).matches) return bp;
  }
  return "desktop";
}

function subscribe(callback: () => void): () => void {
  const mqs = Object.values(QUERIES).map((q) => window.matchMedia(q));
  mqs.forEach((mq) => mq.addEventListener("change", callback));
  return () => mqs.forEach((mq) => mq.removeEventListener("change", callback));
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, detect, () => "desktop");
}

// Mapeia breakpoint -> shell que renderizar. Tablet usa MobileShell ate ter
// shell propria. TV usa Desktop. Quando criar tablet/tv shell, ajustar aqui.
export type Shell = "mobile" | "desktop";

export function shellFor(bp: Breakpoint): Shell {
  if (bp === "mobile" || bp === "tablet") return "mobile";
  return "desktop";
}

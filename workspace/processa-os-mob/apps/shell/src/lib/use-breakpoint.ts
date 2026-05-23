// =============================================================================
// Breakpoints. Decisao 100% por viewport — sem localStorage, sem query string,
// sem heuristica de pointer/standalone. Reage a resize/orientation em tempo
// real via matchMedia.
//
// Limites (largura em px):
//   mobile        :  <  600
//   tablet-pequeno:  600 – 819
//   tablet-grande :  820 – 1199
//   desktop       :  1200 – 1919
//   tv            :  >= 1920
// =============================================================================

import { useSyncExternalStore } from "react";

export type Breakpoint = "mobile" | "tablet-pequeno" | "tablet-grande" | "desktop" | "tv";

const QUERIES: Record<Breakpoint, string> = {
  mobile: "(max-width: 599px)",
  "tablet-pequeno": "(min-width: 600px) and (max-width: 819px)",
  "tablet-grande": "(min-width: 820px) and (max-width: 1199px)",
  desktop: "(min-width: 1200px) and (max-width: 1919px)",
  tv: "(min-width: 1920px)",
};

const ORDER: Breakpoint[] = ["mobile", "tablet-pequeno", "tablet-grande", "desktop", "tv"];

function detect(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  for (const bp of ORDER) {
    if (window.matchMedia(QUERIES[bp]).matches) return bp;
  }
  return "desktop";
}

function subscribe(callback: () => void): () => void {
  const mqs = ORDER.map((bp) => window.matchMedia(QUERIES[bp]));
  mqs.forEach((mq) => mq.addEventListener("change", callback));
  return () => mqs.forEach((mq) => mq.removeEventListener("change", callback));
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, detect, () => "desktop");
}

/** Categoria configuravel de layout (mobile e tablet-pequeno nao tem opcao). */
export type LayoutCategory = "tablet" | "desktop" | "tv";

/** Devolve a categoria de layout pro breakpoint atual, ou null se nao configuravel. */
export function categoryFor(bp: Breakpoint): LayoutCategory | null {
  if (bp === "mobile" || bp === "tablet-pequeno") return null;
  if (bp === "tablet-grande") return "tablet";
  if (bp === "desktop") return "desktop";
  return "tv";
}

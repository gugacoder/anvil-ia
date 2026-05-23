// =============================================================================
// desktop-pinned — fonte única dos slugs pinados no dock desktop.
//
// Storage: pos:shell:<sub>:desktop-pinned = string[]
//
// Default na primeira carga: TODOS os slugs do registry (apps "de fábrica").
// A partir daí o usuário pina/desfixa/reordena à vontade — a ordem em si é
// a ordem do array. Slugs que somem do registry são descartados na leitura;
// novos slugs do registry não são auto-pinados (decisão do usuário).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { loadJSON, saveJSON, shellKey } from "./app-storage";
import { useUserSub } from "./user-context";
import type { AppDef } from "../apps/registry";

const KEY = "desktop-pinned";
const SCHEMA = z.array(z.string());

export interface UsePinnedResult {
  pinned: string[];
  isPinned: (slug: string) => boolean;
  togglePin: (slug: string) => void;
  pin: (slug: string) => void;
  unpin: (slug: string) => void;
  /** Reordena dentro da lista pinada. */
  reorder: (slugs: string[]) => void;
  /** Insere um slug numa posição específica (pina se não estiver). */
  pinAt: (slug: string, index: number) => void;
}

/**
 * Hook de pinados. Hidrata uma vez do storage, persiste em toda mutação
 * (commit atômico — sem estado rascunho). Quando `apps` mudar (registry
 * recarregou), purga slugs órfãos.
 */
export function useDesktopPinned(apps: AppDef[]): UsePinnedResult {
  const sub = useUserSub();
  const key = useMemo(() => shellKey(sub, KEY), [sub]);

  const [pinned, setPinned] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    // Antes do registry chegar, deixa vazio — `hydrate` enche.
    return loadJSON<string[]>(key, [], SCHEMA);
  });
  const [hydrated, setHydrated] = useState(false);

  // Hidrata defaults / purga órfãos quando o registry estiver pronto.
  useEffect(() => {
    if (!apps.length) return;
    const validSlugs = new Set(apps.map((a) => a.id));
    const stored = loadJSON<string[] | null>(key, null as never, SCHEMA.nullable() as never);

    if (stored == null) {
      // primeira execução pra este usuário — pina tudo na ordem do registry
      const defaults = apps.map((a) => a.id);
      saveJSON(key, defaults);
      setPinned(defaults);
    } else {
      const filtered = stored.filter((s) => validSlugs.has(s));
      if (filtered.length !== stored.length) saveJSON(key, filtered);
      setPinned(filtered);
    }
    setHydrated(true);
  }, [apps, key]);

  const persist = useCallback(
    (next: string[]) => {
      setPinned(next);
      saveJSON(key, next);
    },
    [key],
  );

  const isPinned = useCallback((slug: string) => pinned.includes(slug), [pinned]);

  const pin = useCallback(
    (slug: string) => {
      if (pinned.includes(slug)) return;
      persist([...pinned, slug]);
    },
    [pinned, persist],
  );

  const unpin = useCallback(
    (slug: string) => {
      if (!pinned.includes(slug)) return;
      persist(pinned.filter((s) => s !== slug));
    },
    [pinned, persist],
  );

  const togglePin = useCallback(
    (slug: string) => (pinned.includes(slug) ? unpin(slug) : pin(slug)),
    [pinned, pin, unpin],
  );

  const reorder = useCallback(
    (slugs: string[]) => {
      // sanity: mesma cardinalidade e mesmos elementos
      if (slugs.length !== pinned.length) return;
      const a = [...pinned].sort();
      const b = [...slugs].sort();
      if (a.some((x, i) => x !== b[i])) return;
      persist(slugs);
    },
    [pinned, persist],
  );

  const pinAt = useCallback(
    (slug: string, index: number) => {
      const without = pinned.filter((s) => s !== slug);
      const clamped = Math.max(0, Math.min(index, without.length));
      const next = [...without.slice(0, clamped), slug, ...without.slice(clamped)];
      persist(next);
    },
    [pinned, persist],
  );

  return { pinned: hydrated ? pinned : [], isPinned, togglePin, pin, unpin, reorder, pinAt };
}

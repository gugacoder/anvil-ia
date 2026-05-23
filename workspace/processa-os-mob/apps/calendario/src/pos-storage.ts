// =============================================================================
// pos-storage — adoção do contrato do Processa OS para retenção de estado.
// Convenção de chave: pos:state:<sub>:<scope>:<key>
//   - <sub>   = id do usuário logado, lido de window.__pos.sub (default "anon")
//   - <scope> = instanceId recebido via AppInstanceProps (isola janelas)
//   - <key>   = nome livre do estado (ex: "active-id", "draft")
//
// O shell limpa esse prefixo no logout (clearUser) e ao fechar o app
// (clearScope). Apps federados só precisam usar a chave correta.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";

interface PosRuntime {
  sub: string | null;
}

declare global {
  interface Window {
    __pos?: PosRuntime;
  }
}

function currentSub(): string {
  if (typeof window === "undefined") return "anon";
  return window.__pos?.sub ?? "anon";
}

function stateKey(sub: string, scope: string, key: string) {
  return `pos:state:${sub}:${scope}:${key}`;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota/incognito */
  }
}

/** Drop-in para useState com persistência seguindo a convenção do Processa OS. */
export function useAppStorage<T>(
  scope: string,
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const fullKey = stateKey(currentSub(), scope, key);
  const initialRef = useRef(initial);
  const [value, setValueState] = useState<T>(() =>
    loadJSON<T>(fullKey, initialRef.current),
  );

  useEffect(() => {
    setValueState(loadJSON<T>(fullKey, initialRef.current));
  }, [fullKey]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        saveJSON(fullKey, resolved);
        return resolved;
      });
    },
    [fullKey],
  );

  return [value, setValue];
}

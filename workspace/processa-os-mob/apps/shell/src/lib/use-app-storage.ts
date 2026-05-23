// =============================================================================
// useAppStorage — drop-in para `useState`, mas persiste em localStorage.
// Chave: pos:state:<sub>:<scope>:<key>. Scope é o instanceId que o app
// recebe via AppInstanceProps (appId no mobile, windowId no desktop).
//
// Uso típico:
//
//   const [count, setCount] = useAppStorage(instanceId, "count", 0);
//
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { loadJSON, saveJSON, stateKey } from "./app-storage";
import { useUserSub } from "./user-context";

export function useAppStorage<T>(
  scope: string,
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const sub = useUserSub();
  const fullKey = stateKey(sub, scope, key);
  // initial é só pra primeira leitura; depois disso o storage manda
  const initialRef = useRef(initial);
  const [value, setValueState] = useState<T>(() =>
    loadJSON<T>(fullKey, initialRef.current),
  );

  // Se a chave mudar (troca de scope/usuario), re-hidrata
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

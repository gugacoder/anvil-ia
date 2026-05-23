// =============================================================================
// Storage namespacing — único ponto de verdade para retenção de estado.
//
// Hierarquia de chaves no localStorage:
//
//   pos:state:<sub>:<scope>:<key>   — estado de um app (ex: count, draft)
//   pos:shell:<sub>:<key>           — estado da shell (open list, windows)
//
// Limpeza:
//   - logout         → clearUser(sub)             remove tudo do usuário
//   - close de um app → clearScope(sub, scope)    remove estado daquele app
//
// Contrato: `loadJSON` aceita um schema (zod) opcional. Quando informado,
// valida o que veio do storage; se inválido, descarta e devolve fallback +
// warn. Quando omitido, devolve cast sem validação (legacy — não preferido).
// =============================================================================

import type { ZodType } from "zod";

const ROOT = "pos";

export function stateKey(sub: string, scope: string, key: string) {
  return `${ROOT}:state:${sub}:${scope}:${key}`;
}

export function shellKey(sub: string, key: string) {
  return `${ROOT}:shell:${sub}:${key}`;
}

export function loadJSON<T>(key: string, fallback: T, schema?: ZodType<T>): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    if (schema) {
      const result = schema.safeParse(parsed);
      if (!result.success) {
        console.warn(`[storage:${key}] valor invalido, usando fallback`, {
          error: result.error.issues,
          rawSample: raw.slice(0, 200),
        });
        return fallback;
      }
      return result.data;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode — silenciosamente ignora
  }
}

export function removeKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

function clearByPrefix(prefix: string) {
  if (typeof window === "undefined") return;
  const ls = window.localStorage;
  const toRemove: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith(prefix)) toRemove.push(k);
  }
  for (const k of toRemove) ls.removeItem(k);
}

/** Limpa todo o estado de um app específico (ao fechar). */
export function clearScope(sub: string, scope: string) {
  clearByPrefix(`${ROOT}:state:${sub}:${scope}:`);
}

/** Limpa todo o estado de um usuário (ao logout). */
export function clearUser(sub: string) {
  clearByPrefix(`${ROOT}:state:${sub}:`);
  clearByPrefix(`${ROOT}:shell:${sub}:`);
}

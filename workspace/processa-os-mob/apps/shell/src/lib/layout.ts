// =============================================================================
// Layout — resolve qual shell renderizar pra cada categoria de viewport.
//
// Fontes (em ordem de prioridade):
//   1. Env (trava): VITE_LAYOUT_{TABLET|DESKTOP|TV} = CSV
//   2. Preferencia do user (localStorage `os.layout-{categoria}`)
//   3. Default de codigo
//
// Formato CSV: lista de "windowed" e/ou "workspace" separados por virgula.
//   - Primeiro item = layout default.
//   - Lista com 1 item = trava (user nao pode escolher).
//   - Lista com 2 itens = ambos disponiveis, user pode trocar.
//
// Validacao manual em TS por enquanto. Round dedicado a zod refatora depois.
// =============================================================================

import type { LayoutCategory } from "./use-breakpoint";

/** Tipos de shell renderizaveis em desktop/tablet-grande/tv. Mobile fica fora. */
export type ShellKind = "windowed" | "workspace";

const VALID_SHELLS: readonly ShellKind[] = ["windowed", "workspace"] as const;

const DEFAULTS: Record<LayoutCategory, ShellKind[]> = {
  tablet: ["workspace", "windowed"],
  desktop: ["windowed", "workspace"],
  tv: ["windowed", "workspace"],
};

const STORAGE_KEY_PREFIX = "os.layout-";

function isShellKind(value: unknown): value is ShellKind {
  return typeof value === "string" && (VALID_SHELLS as readonly string[]).includes(value);
}

/** Parseia CSV vindo de env. Devolve array valido ou null se invalido/vazio. */
export function parseLayoutCSV(raw: string | undefined | null): ShellKind[] | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  if (parts.length === 0 || parts.length > 2) return null;
  if (!parts.every(isShellKind)) return null;
  const deduped = Array.from(new Set(parts)) as ShellKind[];
  if (deduped.length !== parts.length) return null; // duplicatas
  return deduped;
}

/** Le a variavel de env pra uma categoria. Vite expoe via import.meta.env. */
export function readEnvLayout(category: LayoutCategory): ShellKind[] | null {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  const key = `VITE_LAYOUT_${category.toUpperCase()}`;
  return parseLayoutCSV(meta.env?.[key]);
}

/** Le preferencia do user no localStorage. So aceita se ainda for valida. */
export function readUserPref(category: LayoutCategory): ShellKind | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + category);
    return isShellKind(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Grava a preferencia do user. Passe null pra limpar (voltar ao default). */
export function writeUserPref(category: LayoutCategory, value: ShellKind | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + category);
    } else {
      localStorage.setItem(STORAGE_KEY_PREFIX + category, value);
    }
  } catch {
    /* ignore */
  }
}

export interface ResolvedLayout {
  /** Shell a renderizar. */
  shell: ShellKind;
  /** Lista de shells disponiveis pra o user trocar entre eles. */
  available: ShellKind[];
  /** True se a escolha veio do env (trava — UI nao deve oferecer trocar). */
  locked: boolean;
  /** True se a escolha veio do user (UI mostra "voltar ao padrao"). */
  fromUser: boolean;
  /** O default que seria aplicado se o user nao tivesse escolhido. */
  defaultShell: ShellKind;
}

/** Resolve o layout final pra uma categoria, juntando env + pref + default. */
export function resolveLayout(category: LayoutCategory): ResolvedLayout {
  const envList = readEnvLayout(category);
  const userPref = readUserPref(category);

  // Env presente: trava.
  if (envList && envList.length === 1) {
    return {
      shell: envList[0],
      available: envList,
      locked: true,
      fromUser: false,
      defaultShell: envList[0],
    };
  }

  // Env com 2 ou default de codigo.
  const available = envList ?? DEFAULTS[category];
  const defaultShell = available[0];

  // User escolheu e ainda esta na lista de disponiveis: respeita.
  if (userPref && available.includes(userPref)) {
    return {
      shell: userPref,
      available,
      locked: false,
      fromUser: userPref !== defaultShell ? true : false,
      defaultShell,
    };
  }

  // Sem pref (ou pref invalida apos mudanca de env): usa default.
  return {
    shell: defaultShell,
    available,
    locked: false,
    fromUser: false,
    defaultShell,
  };
}

/** Mapeia ShellKind pra label PT-BR amigavel. */
export function shellLabel(kind: ShellKind): string {
  return kind === "windowed" ? "OS-like (Janelas)" : "Workspace (Sidebar)";
}

/** Descricao curta pra cards de selecao. */
export function shellDescription(kind: ShellKind): string {
  return kind === "windowed"
    ? "Multitarefa, drag e drop, apps em janelas flutuantes."
    : "Foco, sidebar fixa, um app por vez.";
}

/** Label PT-BR da categoria (pra titulos da UI). */
export function categoryLabel(category: LayoutCategory): string {
  return category === "tablet" ? "tablet" : category === "desktop" ? "desktop" : "TV";
}

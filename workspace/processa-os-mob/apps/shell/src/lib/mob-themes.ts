// =============================================================================
// Temas de cor do mob (mobile-only). Cada tema = um hue base que propaga em
// background, card, primary, wallpaper, accent. CSS faz o trabalho pesado;
// aqui so listamos os temas pra UI de selecao e aplicamos a classe na shell.
// =============================================================================

export type ThemeKey = "noite" | "floresta" | "brasa" | "lavanda";

export interface ThemeDef {
  key: ThemeKey;
  label: string;
  description: string;
  /** Hue base usado pra preview/swatch. Bate com o --accent-h definido no CSS. */
  hue: number;
}

export const THEMES: ThemeDef[] = [
  { key: "noite", label: "Noite", description: "Índigo profundo — o padrão.", hue: 240 },
  { key: "floresta", label: "Floresta", description: "Esmeralda e turquesa.", hue: 170 },
  { key: "brasa", label: "Brasa", description: "Laranja quente.", hue: 25 },
  { key: "lavanda", label: "Lavanda", description: "Roxo aveludado.", hue: 295 },
];

const STORAGE_KEY = "mob.theme";
const DEFAULT_THEME: ThemeKey = "noite";

export function readTheme(): ThemeKey {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && THEMES.some((t) => t.key === v)) return v as ThemeKey;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function writeTheme(key: ThemeKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* ignore */
  }
}

/** Retorna a classe CSS pra adicionar no .mob-shell (vazio = padrao "noite"). */
export function themeClass(key: ThemeKey): string {
  return key === "noite" ? "" : `theme-${key}`;
}

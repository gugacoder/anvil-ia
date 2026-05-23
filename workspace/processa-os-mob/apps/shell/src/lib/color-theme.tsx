// =============================================================================
// ColorTheme — tema de cor do SO (4 opcoes). Aplica via classe no <body>.
// Compartilhado entre desktop e mobile. Persiste em localStorage.
// =============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ColorTheme = "noite" | "floresta" | "brasa" | "lavanda";

export interface ColorThemeDef {
  key: ColorTheme;
  label: string;
  description: string;
  /** Hue base. Bate com o --accent-h definido no CSS. Usado pra previews. */
  hue: number;
}

export const COLOR_THEMES: ColorThemeDef[] = [
  { key: "floresta", label: "Floresta", description: "Esmeralda e turquesa.", hue: 170 },
  { key: "noite", label: "Noite", description: "Índigo profundo.", hue: 240 },
  { key: "brasa", label: "Brasa", description: "Laranja quente.", hue: 25 },
  { key: "lavanda", label: "Lavanda", description: "Roxo aveludado.", hue: 295 },
];

const VALID_KEYS = COLOR_THEMES.map((t) => t.key);
const STORAGE_KEY = "os.color-theme";
const DEFAULT_THEME: ColorTheme = "floresta";

interface Ctx {
  theme: ColorTheme;
  setTheme: (t: ColorTheme) => void;
}

const ColorThemeCtx = createContext<Ctx | null>(null);

function readTheme(): ColorTheme {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    if (v && VALID_KEYS.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

function writeTheme(t: ColorTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
}

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ColorTheme>(() => readTheme());

  useEffect(() => {
    // A classe vai no <html>, nao no <body>, para que --accent-h sobreescreva
    // a do :root no mesmo escopo de declaracao das demais vars. Senao, as vars
    // declaradas em :root nao "veem" o override feito no body.
    const root = document.documentElement;
    for (const k of VALID_KEYS) {
      root.classList.toggle(`theme-${k}`, k === theme);
    }
    writeTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: ColorTheme) => setThemeState(t), []);

  const value = useMemo<Ctx>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ColorThemeCtx.Provider value={value}>{children}</ColorThemeCtx.Provider>;
}

export function useColorTheme(): Ctx {
  const ctx = useContext(ColorThemeCtx);
  if (!ctx) throw new Error("ColorThemeProvider missing");
  return ctx;
}

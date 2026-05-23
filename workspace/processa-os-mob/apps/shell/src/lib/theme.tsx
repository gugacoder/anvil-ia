// =============================================================================
// Tema light/dark/system do SO. Aplica `class="dark"|"light"` no <body> apos
// resolver. Em modo "system", escuta prefers-color-scheme em tempo real.
// Persiste em localStorage.
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

import { ThemeModeSchema, type ThemeMode } from "./schemas";
export type { ThemeMode };
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "os.theme";
const DEFAULT_MODE: ThemeMode = "system";

interface Ctx {
  /** Modo escolhido pelo usuario. */
  mode: ThemeMode;
  /** Modo efetivo aplicado (system resolve pra light ou dark). */
  resolvedTheme: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
  /** Atalho: cicla manualmente entre claro e escuro (ignora system). */
  toggle: () => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

function readMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_MODE;
    const parsed = ThemeModeSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    console.warn(`[storage:${STORAGE_KEY}] valor invalido, usando default`, {
      error: parsed.error.issues,
      raw,
    });
  } catch {
    /* ignore */
  }
  return DEFAULT_MODE;
}

function writeMode(m: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, m);
  } catch {
    /* ignore */
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    readMode() === "system" ? (systemPrefersDark() ? "dark" : "light") : (readMode() as ResolvedTheme),
  );

  useEffect(() => {
    function apply(): ResolvedTheme {
      const resolved: ResolvedTheme =
        mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
      document.body.classList.toggle("dark", resolved === "dark");
      document.body.classList.toggle("light", resolved === "light");
      setResolvedTheme(resolved);
      return resolved;
    }

    apply();
    writeMode(mode);

    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => apply();
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => setModeState(m), []);
  const toggle = useCallback(() => {
    setModeState((cur) => {
      const resolved =
        cur === "system" ? (systemPrefersDark() ? "dark" : "light") : (cur as ResolvedTheme);
      return resolved === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ mode, resolvedTheme, setMode, toggle }),
    [mode, resolvedTheme, setMode, toggle],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("ThemeProvider missing");
  return ctx;
}

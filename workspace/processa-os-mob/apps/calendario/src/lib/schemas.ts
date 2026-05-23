// Zod schemas das bordas do app calendario.
// Toda entrada externa (URL params, props vindas do shell, localStorage)
// passa por safeParse com fallback gracioso — nunca explode runtime.

import { z } from "zod";
import { parseISO, isValid } from "date-fns";

/** As 5 visoes do calendario. */
export const ViewSchema = z.enum(["mes", "semana", "dia", "ano", "agenda"]);
export type View = z.infer<typeof ViewSchema>;

/** Param de data na URL: "2026-05-23" -> Date. Invalido -> falha (caller usa fallback). */
export const DateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD")
  .transform((s, ctx) => {
    const d = parseISO(s);
    if (!isValid(d)) {
      ctx.addIssue({ code: "custom", message: "Data invalida" });
      return z.NEVER;
    }
    return d;
  });

/** Resolve date param da URL com fallback pra hoje. */
export function resolveDateParam(raw: string | undefined): Date {
  if (!raw) return new Date();
  const r = DateParamSchema.safeParse(raw);
  return r.success ? r.data : new Date();
}

/** Props vindas do shell. passthrough preserva campos futuros sem quebrar. */
export const AppInstancePropsSchema = z
  .object({
    instanceId: z.string().optional(),
    initialPath: z.string().optional(),
    onPathChange: z.any().optional(),
    onTitleChange: z.any().optional(),
    formFactor: z.enum(["desktop", "mobile"]).optional(),
  })
  .passthrough();
export type AppInstanceProps = z.infer<typeof AppInstancePropsSchema>;

/** Preferencias persistidas em localStorage. catch faz fallback se lixo. */
export const PersistedPrefsSchema = z
  .object({
    lastView: ViewSchema.default("mes"),
  })
  .catch({ lastView: "mes" as const });
export type PersistedPrefs = z.infer<typeof PersistedPrefsSchema>;

const PREFS_KEY = "mob.calendario.prefs.v1";

export function loadPrefs(): PersistedPrefs {
  if (typeof window === "undefined") return { lastView: "mes" };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { lastView: "mes" };
    return PersistedPrefsSchema.parse(JSON.parse(raw));
  } catch {
    return { lastView: "mes" };
  }
}

export function savePrefs(prefs: PersistedPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota/incognito — silencia */
  }
}

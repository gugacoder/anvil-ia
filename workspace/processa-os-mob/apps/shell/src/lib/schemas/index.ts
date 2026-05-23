// =============================================================================
// Schemas centrais. Toda fronteira de dado (API response, SSE event, env var,
// localStorage entry) tem schema declarado aqui. Tipos derivam via z.infer.
//
// Princípio: a entrada nunca lança — sempre `safeParse` + fallback sensato +
// console.warn pra observabilidade. Nada de `parse` solto em código de runtime.
// =============================================================================

import { z } from "zod";

// -----------------------------------------------------------------------------
// API: /me, /auth/login
// -----------------------------------------------------------------------------
export const UserSchema = z.object({
  sub: z.string(),
  name: z.string(),
  avatar: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const MeResponseSchema = z.object({
  user: UserSchema.nullable(),
});

export const LoginResponseSchema = z.object({
  user: UserSchema,
});

// -----------------------------------------------------------------------------
// API: /notes
// -----------------------------------------------------------------------------
export const NoteDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type NoteDto = z.infer<typeof NoteDtoSchema>;

export const NotesListResponseSchema = z.object({ notes: z.array(NoteDtoSchema) });
export const NoteResponseSchema = z.object({ note: NoteDtoSchema });
export const OkResponseSchema = z.object({ ok: z.literal(true) });

// -----------------------------------------------------------------------------
// API: /files
// -----------------------------------------------------------------------------
export const FileItemSchema = z.object({
  name: z.string(),
  dir: z.boolean(),
  size: z.number(),
  modifiedAt: z.string(),
});
export type FileItem = z.infer<typeof FileItemSchema>;

export const FilesListResponseSchema = z.object({
  path: z.string(),
  items: z.array(FileItemSchema),
});

export const FileContentResponseSchema = z.object({
  path: z.string(),
  text: z.string(),
});

// -----------------------------------------------------------------------------
// API: /notifications (recent + SSE)
// -----------------------------------------------------------------------------
export const NotifKindSchema = z.enum(["system", "chat", "note", "file", "info"]);

export const NotifDtoSchema = z.object({
  id: z.string(),
  kind: NotifKindSchema,
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type NotifDto = z.infer<typeof NotifDtoSchema>;

export const NotificationsRecentResponseSchema = z.object({
  items: z.array(NotifDtoSchema),
});

// -----------------------------------------------------------------------------
// API: /apps (registry)
// -----------------------------------------------------------------------------
export const AppKindSchema = z.enum(["internal", "external", "federated"]);

export const AppSizeSchema = z.object({
  w: z.number(),
  h: z.number(),
});

export const AppManifestSchema = z.object({
  slug: z.string(),
  label: z.string(),
  icon: z.string(),
  kind: AppKindSchema,
  basePath: z.string().optional(),
  devPort: z.number().optional(),
  defaultSize: AppSizeSchema,
  order: z.number(),
  multi: z.boolean().optional(),
  defaultPath: z.string().optional(),
});
export type AppManifest = z.infer<typeof AppManifestSchema>;

export const AppsListResponseSchema = z.object({
  apps: z.array(AppManifestSchema),
});

// -----------------------------------------------------------------------------
// Helper: parse com warn — pattern padrão pro time
// -----------------------------------------------------------------------------
/**
 * Valida `raw` contra `schema`. Em caso de erro, loga warn (com contexto + erro
 * formatado + amostra do raw) e devolve `fallback`. Nunca lança.
 */
export function safeParseWithWarn<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  context: string,
  fallback: T,
): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  console.warn(`[schema:${context}] payload invalido`, {
    error: result.error.issues,
    rawSample: truncatePreview(raw),
  });
  return fallback;
}

function truncatePreview(value: unknown): string {
  try {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    return s.length > 200 ? s.slice(0, 200) + "…" : s;
  } catch {
    return String(value);
  }
}

// -----------------------------------------------------------------------------
// localStorage: state persistido das shells
// -----------------------------------------------------------------------------
const PersistedOpenAppSchema = z.object({
  appId: z.string(),
  openedAt: z.number(),
});

export const PersistedMobSchema = z.object({
  open: z.array(PersistedOpenAppSchema),
  foregroundId: z.string().nullable(),
  homeOrder: z.array(z.string()),
});
export type PersistedMob = z.infer<typeof PersistedMobSchema>;

export const PersistedWorkspaceSchema = z.object({
  open: z.array(PersistedOpenAppSchema),
  currentId: z.string().nullable(),
});
export type PersistedWorkspace = z.infer<typeof PersistedWorkspaceSchema>;

// -----------------------------------------------------------------------------
// localStorage: preferências de tema/cor
// -----------------------------------------------------------------------------
export const ThemeModeSchema = z.enum(["light", "dark", "system"]);
export type ThemeMode = z.infer<typeof ThemeModeSchema>;

export const ColorThemeSchema = z.enum(["noite", "floresta", "brasa", "lavanda"]);
export type ColorTheme = z.infer<typeof ColorThemeSchema>;

// -----------------------------------------------------------------------------
// Env/localStorage: layout (windowed/workspace)
// -----------------------------------------------------------------------------
export const ShellKindSchema = z.enum(["windowed", "workspace"]);
export type ShellKind = z.infer<typeof ShellKindSchema>;

export const LayoutListSchema = z
  .array(ShellKindSchema)
  .min(1)
  .max(2)
  .refine((arr) => new Set(arr).size === arr.length, "Sem duplicatas");
export type LayoutList = z.infer<typeof LayoutListSchema>;

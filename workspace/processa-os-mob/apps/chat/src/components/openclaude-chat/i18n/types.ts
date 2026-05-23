import type { enUS } from "./locales/en-US.js";

/** All translation keys — derived from en-US (source of truth). */
export type TranslationKeys = Record<keyof typeof enUS, string>;

/** Built-in locale slugs shipped with the library. */
export type BuiltInLocale = "en-US" | "pt-BR" | "es-ES";

/** Any locale slug — built-in or custom. */
export type LocaleSlug = string;

/** Metadata for a locale shown in the locale selector. */
export interface LocaleInfo {
  slug: string;
  name: string;
  flag: string;
}

/**
 * Consumer-provided translation overrides, keyed by locale slug.
 * For built-in locales, partial overrides are merged on top.
 * For new locales, consumer should provide all keys (missing keys fall back to en-US).
 */
export type CustomMessages = Record<string, Partial<TranslationKeys> & Record<string, string>>;

/** Consumer-provided locale metadata for custom locales (shown in locale selector). */
export type CustomLocaleInfo = Record<string, { name: string; flag: string }>;

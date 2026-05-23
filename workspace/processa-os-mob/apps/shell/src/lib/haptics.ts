// Pequena camada sobre vibration API. Silencia onde nao existe.

export type HapticKind = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 22,
  selection: 5,
  success: [8, 30, 8],
  warning: [16, 30, 16],
  error: [22, 40, 22, 40, 22],
};

export function haptic(kind: HapticKind = "light"): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* ignore */
  }
}

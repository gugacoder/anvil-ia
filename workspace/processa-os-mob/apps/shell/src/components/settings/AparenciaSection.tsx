import { Sun, Moon, MonitorCog, Check } from "lucide-react";
import { useTheme, type ThemeMode, type ResolvedTheme } from "../../lib/theme";
import { useColorTheme, COLOR_THEMES, type ColorTheme } from "../../lib/color-theme";

export function AparenciaSection() {
  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Aparência</h2>
        <p className="text-xs text-muted-foreground">
          Modo claro/escuro e tema de cor do sistema.
        </p>
      </header>

      <ModeSegmented />
      <ColorThemeGrid />
    </section>
  );
}

function ModeSegmented() {
  const { mode, setMode } = useTheme();
  const options: Array<{ key: ThemeMode; label: string; Icon: typeof Sun }> = [
    { key: "light", label: "Claro", Icon: Sun },
    { key: "dark", label: "Escuro", Icon: Moon },
    { key: "system", label: "Sistema", Icon: MonitorCog },
  ];
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Modo</div>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-card/40 p-1 ring-1 ring-border/40">
        {options.map((o) => {
          const active = mode === o.key;
          const Icon = o.Icon;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setMode(o.key)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-card/80"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorThemeGrid() {
  const { theme, setTheme } = useColorTheme();
  const { resolvedTheme } = useTheme();
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Tema de cor
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COLOR_THEMES.map((t) => (
          <ColorThemeCard
            key={t.key}
            themeKey={t.key}
            label={t.label}
            description={t.description}
            hue={t.hue}
            mode={resolvedTheme}
            selected={theme === t.key}
            onSelect={() => setTheme(t.key)}
          />
        ))}
      </div>
    </div>
  );
}

function ColorThemeCard({
  themeKey,
  label,
  description,
  hue,
  mode,
  selected,
  onSelect,
}: {
  themeKey: ColorTheme;
  label: string;
  description: string;
  hue: number;
  mode: ResolvedTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  // Preview espelha o wallpaper real (mesmas formulas de styles.css), adaptando
  // claro/escuro conforme o modo atual.
  const preview =
    mode === "dark"
      ? `
        radial-gradient(at 25% 25%, oklch(0.5 0.16 ${hue} / 0.85), transparent 60%),
        radial-gradient(at 75% 75%, oklch(0.55 0.18 ${hue - 90} / 0.7), transparent 60%),
        linear-gradient(155deg, oklch(0.18 0.03 ${hue}), oklch(0.12 0.02 ${hue}))
      `
      : `
        radial-gradient(at 25% 25%, oklch(0.88 0.07 ${hue} / 0.85), transparent 60%),
        radial-gradient(at 75% 75%, oklch(0.9 0.06 ${hue - 90} / 0.7), transparent 60%),
        linear-gradient(155deg, oklch(0.96 0.015 ${hue}), oklch(0.92 0.015 ${hue}))
      `;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-xl text-left ring-1 transition-all active:scale-[0.98] ${
        selected ? "ring-2 ring-primary" : "ring-border/40 hover:ring-border"
      }`}
      aria-pressed={selected}
      aria-label={`Tema ${label}`}
      data-theme-key={themeKey}
    >
      <div className="h-20 w-full" style={{ background: preview }} />
      <div className="flex items-start justify-between gap-2 bg-card/85 px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="truncate text-[11px] text-muted-foreground">{description}</div>
        </div>
        {selected && (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </div>
    </button>
  );
}

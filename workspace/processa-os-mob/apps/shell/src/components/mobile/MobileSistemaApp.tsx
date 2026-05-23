// =============================================================================
// MobileSistemaApp — Configuracoes do SO em duas colunas:
//   - rail vertical estreito a esquerda (icones + labels curtos)
//   - area util a direita (renderiza a secao selecionada)
// Mobile-only (o desktop continua com SistemaApp). Persiste secao corrente em
// state local (nao precisa global pra isso).
// =============================================================================

import { useState } from "react";
import { Palette, Info, Check } from "lucide-react";
import { useMobState } from "../../lib/mob-state";
import { THEMES, type ThemeKey } from "../../lib/mob-themes";
import { haptic } from "../../lib/haptics";

type SectionKey = "aparencia" | "sobre";

interface Section {
  key: SectionKey;
  label: string;
  Icon: typeof Palette;
}

const SECTIONS: Section[] = [
  { key: "aparencia", label: "Aparência", Icon: Palette },
  { key: "sobre", label: "Sobre", Icon: Info },
];

export function MobileSistemaApp() {
  const [current, setCurrent] = useState<SectionKey>("aparencia");

  return (
    <div className="flex h-full w-full bg-background text-foreground">
      {/* Rail vertical a esquerda */}
      <nav className="flex w-20 shrink-0 flex-col gap-1 border-r border-border/60 bg-card/40 px-2 py-3 sm:w-32">
        {SECTIONS.map((s) => {
          const active = s.key === current;
          const Icon = s.Icon;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                haptic("selection");
                setCurrent(s.key);
              }}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-[11px] transition-colors sm:flex-row sm:gap-2 sm:text-sm ${
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} />
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Area util a direita */}
      <div className="min-w-0 flex-1 overflow-auto px-4 py-4">
        {current === "aparencia" && <AparenciaSection />}
        {current === "sobre" && <SobreSection />}
      </div>
    </div>
  );
}

function AparenciaSection() {
  const { theme, setTheme } = useMobState();
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-lg font-semibold">Aparência</h1>
        <p className="text-xs text-muted-foreground">
          Escolha o tema de cor do sistema. Aplica em todo o shell e wallpaper.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((t) => (
          <ThemeCard
            key={t.key}
            themeKey={t.key}
            label={t.label}
            description={t.description}
            hue={t.hue}
            selected={theme === t.key}
            onSelect={() => {
              haptic("light");
              setTheme(t.key);
            }}
          />
        ))}
      </div>
    </section>
  );
}

function ThemeCard({
  themeKey,
  label,
  description,
  hue,
  selected,
  onSelect,
}: {
  themeKey: ThemeKey;
  label: string;
  description: string;
  hue: number;
  selected: boolean;
  onSelect: () => void;
}) {
  // Preview do gradiente do wallpaper aplicado ao card
  const preview = `
    radial-gradient(at 25% 25%, hsl(${hue} 70% 55% / 0.85), transparent 60%),
    radial-gradient(at 75% 75%, hsl(${hue + 50} 75% 60% / 0.7), transparent 60%),
    linear-gradient(155deg, oklch(0.18 0.03 ${hue}), oklch(0.12 0.02 ${hue}))
  `;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl text-left ring-1 transition-all active:scale-[0.98] ${
        selected ? "ring-2 ring-primary" : "ring-border/40"
      }`}
      aria-pressed={selected}
      aria-label={`Tema ${label}`}
      data-theme-key={themeKey}
    >
      <div className="h-24 w-full" style={{ background: preview }} />
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

function SobreSection() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-lg font-semibold">Sobre</h1>
        <p className="text-xs text-muted-foreground">
          Processa OS — variante mobile com app drawer, gestos e temas.
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <InfoRow label="Versão" value="0.1.0" />
        <InfoRow label="Edition" value="mob" />
        <InfoRow label="Shell" value="@mob/shell" />
        <InfoRow
          label="Build"
          value={(import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE ?? "dev"}
        />
      </dl>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/60 px-3 py-2 ring-1 ring-border/30">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

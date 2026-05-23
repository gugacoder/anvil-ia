// =============================================================================
// SettingsApp — Configuracoes do SO. Componente unico, dois layouts:
//   - desktop: rail vertical a esquerda + detalhe a direita
//   - mobile : stack (lista de secoes -> detalhe com botao voltar)
// Sections definidas como dados; o conteudo de cada uma vive em settings/*.
// initialPath aceita "/aparencia", "/perfil", "/sobre" — usado pra deep-link
// (ex: TopBar > Personalizar abre direto em Aparencia).
// =============================================================================

import { useState, type ComponentType } from "react";
import { User, Palette, Info, ChevronRight, ArrowLeft } from "lucide-react";
import type { AppInstanceProps } from "../apps/registry";
import { PerfilSection } from "./settings/PerfilSection";
import { AparenciaSection } from "./settings/AparenciaSection";
import { SobreSection } from "./settings/SobreSection";

type SectionKey = "perfil" | "aparencia" | "sobre";

interface Section {
  key: SectionKey;
  label: string;
  Icon: typeof User;
  Component: ComponentType;
}

const SECTIONS: Section[] = [
  { key: "perfil", label: "Perfil", Icon: User, Component: PerfilSection },
  { key: "aparencia", label: "Aparência", Icon: Palette, Component: AparenciaSection },
  { key: "sobre", label: "Sobre", Icon: Info, Component: SobreSection },
];

function pathToSection(path?: string): SectionKey | null {
  if (!path) return null;
  const slug = path.replace(/^\/+/, "").split("/")[0]?.toLowerCase();
  const match = SECTIONS.find((s) => s.key === slug);
  return match ? match.key : null;
}

export function SettingsApp({ formFactor, initialPath }: AppInstanceProps) {
  const initial = pathToSection(initialPath);
  // desktop: sempre tem uma section ativa (Perfil default); mobile: pode estar
  // na lista raiz (null) ou em uma section
  const [current, setCurrent] = useState<SectionKey | null>(
    formFactor === "desktop" ? (initial ?? "perfil") : initial,
  );

  if (formFactor === "mobile") {
    return <MobileLayout current={current} setCurrent={setCurrent} />;
  }
  return <DesktopLayout current={current ?? "perfil"} setCurrent={setCurrent} />;
}

// -----------------------------------------------------------------------------
// Desktop: rail esquerda + detalhe direita
// -----------------------------------------------------------------------------
function DesktopLayout({
  current,
  setCurrent,
}: {
  current: SectionKey;
  setCurrent: (k: SectionKey) => void;
}) {
  const Current = SECTIONS.find((s) => s.key === current)?.Component ?? PerfilSection;
  return (
    <div className="flex h-full w-full bg-background text-foreground">
      <nav className="flex w-44 shrink-0 flex-col gap-1 border-r border-border/60 bg-card/40 px-2 py-3">
        {SECTIONS.map((s) => {
          const active = s.key === current;
          const Icon = s.Icon;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setCurrent(s.key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1 overflow-auto px-6 py-5">
        <Current />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mobile: stack — lista raiz -> detalhe (com voltar)
// -----------------------------------------------------------------------------
function MobileLayout({
  current,
  setCurrent,
}: {
  current: SectionKey | null;
  setCurrent: (k: SectionKey | null) => void;
}) {
  if (current === null) {
    return (
      <div className="h-full w-full bg-background text-foreground">
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-semibold">Configurações</h1>
        </header>
        <ul className="divide-y divide-border/40">
          {SECTIONS.map((s) => {
            const Icon = s.Icon;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => setCurrent(s.key)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-card/60"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-card/70 ring-1 ring-border/40">
                    <Icon className="h-4 w-4" strokeWidth={1.9} />
                  </span>
                  <span className="flex-1 text-sm font-medium">{s.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  const section = SECTIONS.find((s) => s.key === current);
  if (!section) {
    setCurrent(null);
    return null;
  }
  const Current = section.Component;
  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 border-b border-border/40 px-2 py-2">
        <button
          type="button"
          onClick={() => setCurrent(null)}
          className="flex items-center gap-1 rounded-lg p-2 text-sm text-primary hover:bg-card/60"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </button>
        <h1 className="flex-1 truncate text-center text-sm font-semibold">{section.label}</h1>
        <span className="w-16" />
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        <Current />
      </div>
    </div>
  );
}

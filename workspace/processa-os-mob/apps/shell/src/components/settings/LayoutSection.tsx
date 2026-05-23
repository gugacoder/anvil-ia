import { Check, Lock } from "lucide-react";
import { useBreakpoint, categoryFor } from "../../lib/use-breakpoint";
import {
  resolveLayout,
  writeUserPref,
  shellLabel,
  shellDescription,
  categoryLabel,
  type ShellKind,
} from "../../lib/layout";
import { useState, useEffect } from "react";

/**
 * Pagina dedicada de Layout dentro de Configuracoes.
 * - Mostra so a categoria correspondente ao viewport atual
 * - Mobile/tablet-pequeno: mostra info explicativa, sem opcoes
 * - Outros: cards de selecao (1 se locked, 2 se configuravel)
 */
export function LayoutSection() {
  const bp = useBreakpoint();
  const category = categoryFor(bp);

  // Force re-render quando pref muda (escrita direta no localStorage)
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  useEffect(() => {
    // tick existe so pra invalidar render — nao precisa de logica
  }, [tick]);

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Layout</h2>
        <p className="text-xs text-muted-foreground">
          Como o sistema se apresenta na sua tela.
        </p>
      </header>

      {!category ? (
        <NoChoicePanel />
      ) : (
        <CategoryPanel key={tick} category={category} onChange={bump} />
      )}
    </section>
  );
}

function NoChoicePanel() {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/40 px-4 py-6 text-sm text-muted-foreground">
      Em telas pequenas (celular ou tablet compacto), o layout é otimizado pra
      toque e não tem opções de troca.
    </div>
  );
}

function CategoryPanel({
  category,
  onChange,
}: {
  category: "tablet" | "desktop" | "tv";
  onChange: () => void;
}) {
  const resolved = resolveLayout(category);
  const catLabel = categoryLabel(category);

  if (resolved.locked) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>Fixado pela configuração do sistema.</span>
        </div>
        <div className="max-w-[320px]">
          <LayoutCard
            kind={resolved.shell}
            selected={true}
            locked={true}
            isDefault={true}
            onSelect={() => {
              /* locked — no-op */
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Você está usando um {catLabel}. Escolha como o sistema se apresenta nele.
      </div>
      <div className="grid max-w-[640px] grid-cols-1 gap-3 md:grid-cols-2">
        {resolved.available.map((kind) => (
          <LayoutCard
            key={kind}
            kind={kind}
            selected={resolved.shell === kind}
            locked={false}
            isDefault={kind === resolved.defaultShell}
            onSelect={() => {
              writeUserPref(category, kind);
              onChange();
              // recarrega pra trocar a shell (mudanca de shell raiz)
              window.location.reload();
            }}
          />
        ))}
      </div>
      {resolved.fromUser && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              writeUserPref(category, null);
              onChange();
              window.location.reload();
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Voltar ao padrão ↩
          </button>
        </div>
      )}
    </div>
  );
}

function LayoutCard({
  kind,
  selected,
  locked,
  isDefault,
  onSelect,
}: {
  kind: ShellKind;
  selected: boolean;
  locked: boolean;
  isDefault: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      aria-pressed={selected}
      className={`group relative overflow-hidden rounded-xl text-left ring-1 transition-all ${
        selected ? "ring-2 ring-primary" : "ring-border/40 hover:ring-border"
      } ${locked ? "cursor-default opacity-90" : "active:scale-[0.98]"}`}
    >
      <LayoutPreview kind={kind} />
      <div className="flex items-start justify-between gap-2 bg-card/85 px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{shellLabel(kind)}</span>
            {isDefault && !locked && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                padrão
              </span>
            )}
            {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {shellDescription(kind)}
          </div>
        </div>
        {selected && !locked && (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * Mini-mockup de cada layout. Usa tokens (--background, --card, --border,
 * --primary) — automaticamente acompanha tema corrente.
 */
function LayoutPreview({ kind }: { kind: ShellKind }) {
  if (kind === "windowed") {
    return (
      <div
        className="relative h-28 w-full"
        style={{ background: "var(--background)" }}
      >
        {/* TopBar fina */}
        <div
          className="absolute top-2 right-3 left-3 h-3 rounded-full"
          style={{ background: "color-mix(in oklch, var(--card) 80%, transparent)" }}
        />
        {/* Janelas */}
        <div
          className="absolute top-7 left-4 h-8 w-12 rounded shadow-sm ring-1"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        />
        <div
          className="absolute top-9 left-12 h-10 w-16 rounded shadow-sm ring-1"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        />
        <div
          className="absolute top-7 right-6 h-9 w-14 rounded shadow-sm ring-1"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        />
        {/* Dock */}
        <div
          className="absolute bottom-2 left-1/2 flex h-5 -translate-x-1/2 items-center gap-1 rounded-full px-2"
          style={{ background: "color-mix(in oklch, var(--card) 80%, transparent)" }}
        >
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/80" />
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/60" />
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/60" />
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/60" />
        </div>
      </div>
    );
  }
  // workspace
  return (
    <div
      className="relative flex h-28 w-full"
      style={{ background: "var(--background)" }}
    >
      {/* Sidebar */}
      <div
        className="flex h-full w-10 shrink-0 flex-col gap-1 px-1.5 py-2"
        style={{ background: "color-mix(in oklch, var(--card) 90%, transparent)" }}
      >
        <div className="h-2.5 w-full rounded-sm bg-primary/70" />
        <div className="my-0.5 h-px bg-border/60" />
        <div className="h-1.5 w-full rounded-sm" style={{ background: "color-mix(in oklch, var(--primary) 35%, transparent)" }} />
        <div className="h-1.5 w-full rounded-sm bg-foreground/15" />
        <div className="h-1.5 w-full rounded-sm bg-foreground/15" />
        <div className="h-1.5 w-full rounded-sm bg-foreground/15" />
        <div className="flex-1" />
        <div className="my-0.5 h-px bg-border/60" />
        <div className="h-2.5 w-full rounded-full bg-foreground/25" />
      </div>
      {/* Area central */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Breadcrumb */}
        <div
          className="flex h-4 shrink-0 items-center px-2"
          style={{ background: "color-mix(in oklch, var(--card) 50%, transparent)" }}
        >
          <span className="h-1 w-10 rounded-sm bg-foreground/30" />
        </div>
        {/* Conteudo */}
        <div className="flex-1" />
      </div>
    </div>
  );
}

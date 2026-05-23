// =============================================================================
// ContadorApp — probe de retenção de estado. Tudo aqui usa `useAppStorage`,
// que é o caminho oficial para apps reterem estado entre:
//   - troca de app (mobile/weblike: app fica montado em background; desktop:
//     janela fica montada mesmo minimizada)
//   - reload do browser (estado vive em localStorage namespaceado por user)
//
// Estado só se perde se o app for fechado pelo usuário ou se o usuário fizer
// logout — ambos os caminhos chamam clearScope/clearUser explicitamente.
// =============================================================================

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useAppStorage } from "../lib/use-app-storage";
import type { AppInstanceProps } from "./registry";

export function ContadorApp({ instanceId }: AppInstanceProps) {
  const [count, setCount] = useAppStorage<number>(instanceId, "count", 0);
  const [note, setNote] = useAppStorage<string>(instanceId, "note", "");

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-auto bg-background p-6">
      <header>
        <h1 className="text-lg font-semibold text-foreground">Contador</h1>
        <p className="text-xs text-muted-foreground">
          App de prova. Estado persistido em <code>localStorage</code> com
          escopo <code>{instanceId}</code>.
        </p>
      </header>

      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Contador</span>
          <span
            data-testid="contador-value"
            className="font-mono text-4xl font-semibold tabular-nums text-foreground"
          >
            {count}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCount((c) => c - 1)}
            className="inline-flex items-center gap-1 rounded-md bg-card px-3 py-1.5 text-sm hover:bg-accent"
          >
            <Minus className="h-3.5 w-3.5" />
            Decrementar
          </button>
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Incrementar
          </button>
          <button
            type="button"
            onClick={() => setCount(0)}
            className="inline-flex items-center gap-1 rounded-md bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Zerar
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Rascunho</span>
          <textarea
            data-testid="contador-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Digite algo. Troque de app, volte, recarregue a página — o texto deve continuar aqui."
            className="min-h-32 resize-y rounded-md bg-background px-3 py-2 text-sm outline-none ring-1 ring-border/40 focus:ring-primary/50"
          />
        </label>
      </section>

      <footer className="text-xs text-muted-foreground">
        Estado vive em <code>pos:state:&lt;sub&gt;:{instanceId}:*</code>.
      </footer>
    </div>
  );
}

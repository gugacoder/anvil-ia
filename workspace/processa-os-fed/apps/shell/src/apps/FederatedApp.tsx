import React, { Suspense, Component, useEffect, type ReactNode, type ErrorInfo } from "react";

/**
 * Injeta o CSS do remote como <link> no head do host. O
 * @originjs/vite-plugin-federation NAO carrega o CSS junto do JS exposed —
 * fazemos isso aqui por convencao: cada remote emite `assets/styles.css`
 * (configurado via cssCodeSplit:false + assetFileNames no vite.config dele).
 *
 * Sem isso, classes como `.hidden`, `.bg-card`, `dark:` etc. nao se aplicam
 * dentro do remote — porque o CSS bundle do remote nunca eh carregado.
 */
function useRemoteStylesheet(slug: string) {
  useEffect(() => {
    const id = `fed-css-${slug}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `/so/${slug}/assets/styles.css`;
    document.head.appendChild(link);
  }, [slug]);
}

/** Fallback de carregamento para apps federados. */
function LoadingFallback() {
  return (
    <div className="grid h-full place-items-center bg-background text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Carregando app...</span>
      </div>
    </div>
  );
}

/** Fallback de erro para quando o remote nao carrega. */
function ErrorFallback({ name, error }: { name: string; error: string }) {
  return (
    <div className="grid h-full place-items-center bg-background px-6 text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-destructive">Falha ao carregar app federado</span>
        <code className="rounded bg-card px-2 py-0.5">{name}</code>
        <p className="max-w-sm text-xs">{error}</p>
      </div>
    </div>
  );
}

/** ErrorBoundary simples pra capturar erros de import() do remote. */
class FederatedErrorBoundary extends Component<
  { name: string; children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(`[FederatedApp] Erro ao carregar remote "${this.props.name}":`, err, info);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback name={this.props.name} error={this.state.error} />;
    }
    return this.props.children;
  }
}

/**
 * Wrapper para renderizar um componente de app remoto via Module Federation.
 * Usa Suspense (para o lazy import) e ErrorBoundary (para falhas de rede/build).
 */
export function FederatedApp({
  name,
  loader,
}: {
  name: string;
  loader: () => Promise<{ default: React.ComponentType; [key: string]: unknown }>;
}) {
  useRemoteStylesheet(name);
  const LazyComponent = React.lazy(loader);
  return (
    <FederatedErrorBoundary name={name}>
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent />
      </Suspense>
    </FederatedErrorBoundary>
  );
}

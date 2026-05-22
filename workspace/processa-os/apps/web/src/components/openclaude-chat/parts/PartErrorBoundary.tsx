import React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "../i18n/index.js";

interface State {
  hasError: boolean;
  message?: string;
}

interface Props {
  children: React.ReactNode;
  label?: string;
}

/**
 * Isola o crash de um renderer (ex: display widget com input invalido) pra
 * evitar que um unico bloco derrube a arvore React inteira. O chat continua
 * renderizando os outros parts, e no lugar do part quebrado mostra um aviso.
 */
export class PartErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[openclaude-chat] part renderer failed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback label={this.props.label} message={this.state.message} />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({ label, message }: { label?: string; message?: string }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
    >
      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
      <span className="flex-1 min-w-0 break-words font-mono">
        {label ? `[${label}] ` : ""}
        {message ?? t("partError.default")}
      </span>
    </div>
  );
}

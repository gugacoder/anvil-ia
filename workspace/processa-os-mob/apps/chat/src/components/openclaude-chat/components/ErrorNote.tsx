import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils.js";
import { useTranslation } from "../i18n/index.js";

export interface ErrorNoteProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorNote({ message, onRetry, className }: ErrorNoteProps) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive",
        className
      )}
    >
      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
      <span className="flex-1 min-w-0 break-words">
        {message ?? t("error.default")}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <RotateCcw className="size-3.5" />
          {t("error.retry")}
        </button>
      )}
    </div>
  );
}

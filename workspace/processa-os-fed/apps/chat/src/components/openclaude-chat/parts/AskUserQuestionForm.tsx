// AskUserQuestionForm — renderer da tool nativa AskUserQuestion (CLI openclaude).
// Estados visuais cobertos: aguardando input, submitting, resolved (answers),
// resolved (cancelled), error.

import { memo, useCallback, useMemo, useState } from "react";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils.js";
import { useChatContext } from "../hooks/ChatProvider.js";
import { useTranslation } from "../i18n/index.js";
import type { AskUserQuestionPart } from "../types.js";

export interface AskUserQuestionFormProps {
  part: AskUserQuestionPart;
}

export const AskUserQuestionForm = memo(function AskUserQuestionForm({ part }: AskUserQuestionFormProps) {
  const { t } = useTranslation();
  const { respondToAskUserQuestion, cancelAskUserQuestion } = useChatContext();
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    // Pre-popula se já tem `resolved` (replay).
    if (part.resolved && !("cancelled" in part.resolved)) {
      const r: Record<string, string[]> = {};
      for (const [q, a] of Object.entries(part.resolved.answers)) {
        r[q] = a.split(",").map((s) => s.trim());
      }
      return r;
    }
    return {};
  });

  const total = part.questions.length;
  const answeredCount = useMemo(
    () => part.questions.filter((q) => (selections[q.question] ?? []).length > 0).length,
    [part.questions, selections],
  );
  const allAnswered = answeredCount === total;
  const isResolved = part.resolved !== undefined;
  const isCancelled = isResolved && "cancelled" in part.resolved!;
  const submitting = !!part.submitting;

  const toggleOption = useCallback(
    (questionText: string, optionLabel: string, multiSelect: boolean) => {
      if (isResolved || submitting) return;
      setSelections((prev) => {
        const cur = prev[questionText] ?? [];
        if (multiSelect) {
          return {
            ...prev,
            [questionText]: cur.includes(optionLabel)
              ? cur.filter((x) => x !== optionLabel)
              : [...cur, optionLabel],
          };
        }
        return { ...prev, [questionText]: [optionLabel] };
      });
    },
    [isResolved, submitting],
  );

  const onSubmit = useCallback(async () => {
    if (!allAnswered || submitting || isResolved) return;
    const answers: Record<string, string> = {};
    for (const q of part.questions) {
      const sel = selections[q.question] ?? [];
      answers[q.question] = sel.join(", ");
    }
    try {
      await respondToAskUserQuestion(part.callId, { answers });
    } catch {
      /* erro renderizado via part.error */
    }
  }, [allAnswered, submitting, isResolved, part.callId, part.questions, selections, respondToAskUserQuestion]);

  const onCancel = useCallback(async () => {
    if (submitting || isResolved) return;
    try {
      await cancelAskUserQuestion(part.callId);
    } catch {
      /* idem */
    }
  }, [submitting, isResolved, part.callId, cancelAskUserQuestion]);

  // ─── Estado: resolved + cancelled ─────────────────────────────────────
  if (isCancelled) {
    return (
      <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-medium">
          <X className="h-3.5 w-3.5 shrink-0" />
          {t("askUser.cancelled")}
        </div>
      </div>
    );
  }

  // ─── Estado: resolved + answered (resumo colapsado) ───────────────────
  if (isResolved && !isCancelled) {
    const ans = (part.resolved as { answers: Record<string, string> }).answers;
    return (
      <div className="rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 px-3 py-2.5 text-sm">
        <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400 mb-2">
          <Check className="h-4 w-4 shrink-0" />
          {t("askUser.resolved")}
        </div>
        <div className="space-y-1.5">
          {part.questions.map((q) => {
            const a = ans[q.question];
            if (!a) return null;
            return (
              <div key={q.question} className="flex flex-wrap items-baseline gap-1.5 text-xs">
                <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">{q.header}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium text-foreground">{a}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Estado: aguardando input (form interativo) ───────────────────────
  return (
    <div className={cn(
      "rounded-lg border bg-background px-3 py-3 text-sm",
      submitting && "opacity-70 pointer-events-none",
    )}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-medium">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t("askUser.title")}</span>
        </div>
        {total > 1 && (
          <span>{t("askUser.progress").replace("{current}", String(answeredCount)).replace("{total}", String(total))}</span>
        )}
      </div>

      {part.error && (
        <div className="mb-3 rounded border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
          <div className="flex-1">
            <div className="font-medium text-destructive">{t("askUser.errorSubmit")}</div>
            <div className="text-muted-foreground mt-0.5">{part.error}</div>
          </div>
        </div>
      )}

      <fieldset className="space-y-4">
        {part.questions.map((q, qIdx) => {
          const sel = selections[q.question] ?? [];
          return (
            <div key={q.question} className={cn(qIdx > 0 && "border-t pt-3")}>
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary ring-1 ring-primary/20">
                  {q.header}
                </span>
                {q.multiSelect && (
                  <span className="text-muted-foreground">{t("askUser.multiSelectHint")}</span>
                )}
              </div>
              <legend className="mb-2 font-medium text-foreground">{q.question}</legend>
              <div className="space-y-1.5">
                {q.options.map((opt) => {
                  const checked = sel.includes(opt.label);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => toggleOption(q.question, opt.label, q.multiSelect)}
                      disabled={isResolved || submitting}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left transition-colors",
                        checked
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:bg-accent",
                        (isResolved || submitting) && "cursor-not-allowed opacity-50",
                      )}
                      aria-pressed={checked}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center",
                            q.multiSelect ? "rounded" : "rounded-full",
                            checked ? "bg-primary text-primary-foreground" : "border border-muted-foreground/40",
                          )}
                          aria-hidden
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{opt.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </fieldset>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting || isResolved}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("askUser.cancel")}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!allAnswered || submitting || isResolved}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {submitting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t("askUser.submitting")}</span>
            </>
          ) : (
            <>
              <Check className="h-3 w-3" />
              <span>
                {t("askUser.submit")}
                {!allAnswered && total > 1 && ` (${answeredCount}/${total})`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

import { memo, useState } from "react";
import { Paperclip, ChevronDown, Loader2, Check, Sparkles } from "lucide-react";
import { Markdown } from "../components/Markdown.js";
import { ReasoningBlock } from "./ReasoningBlock.js";
import { ToolActivity } from "./ToolActivity.js";
import { ToolResult } from "./ToolResult.js";
import { TaskCard, type TaskCardProps } from "./TaskCard.js";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/collapsible.js";
import { cn } from "../lib/utils.js";
import { useTranslation } from "../i18n/index.js";
import type {
  MessagePart,
  TextPart,
  ReasoningPart,
  ToolInvocationPart,
  StatusToastPart,
  CompactBoundaryPart,
  PromptSuggestionPart,
  AskUserQuestionPart,
} from "../types.js";
import { AskUserQuestionForm } from "./AskUserQuestionForm.js";
import { ArtifactCard } from "./artifacts/ArtifactCard.js";
import type { ArtifactPart } from "../types.js";
import { parseArtifacts } from "../artifacts/parser.js";
import { useChatContext } from "../hooks/ChatProvider.js";

export interface PartRendererProps {
  part: MessagePart;
  isStreaming?: boolean;
  /** Provided by MessageBubble — used pra dedup de artifact por identifier. */
  messageId?: string;
  partIndex?: number;
}

// ─── Attachment sub-components ────────────────────────────────────────────────

function AttachmentTextBlock({ filename, content }: { filename: string; content: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const lines = content.split("\n");
  const preview = lines.slice(0, 3).join("\n") + (lines.length > 3 && !open ? "\n…" : "");

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border text-xs overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate font-medium">{filename}</span>
        <CollapsibleTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label={open ? t("part.collapse") : t("part.expand")}>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
      </div>
      <pre className="px-3 py-2 text-muted-foreground whitespace-pre-wrap break-words">{preview}</pre>
      <CollapsibleContent>
        <pre className="px-3 py-2 max-h-40 overflow-auto whitespace-pre-wrap break-words border-t">{content}</pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Artifact-aware text ──────────────────────────────────────────────────────
// Parseia <antArtifact> dentro de uma text part e renderiza intercalado.
// Se o id do artifact apareceu de novo numa mensagem posterior, este aqui
// é "superseded" — placeholder discreto.

function ArtifactAwareText({
  text,
  messageId,
  partIndex,
}: {
  text: string;
  messageId?: string;
  partIndex?: number;
}) {
  const { artifactLatestAddress } = useChatContext();
  if (!text.includes("<antArtifact")) {
    return <Markdown>{text}</Markdown>;
  }
  const segs = parseArtifacts(text);
  if (segs.every((s) => s.kind === "text")) {
    return <Markdown>{text}</Markdown>;
  }
  let tagIdx = 0;
  return (
    <div className="flex flex-col gap-3">
      {segs.map((s, i) => {
        if (s.kind === "text") return <Markdown key={i}>{s.value}</Markdown>;
        const localTagIdx = tagIdx++;
        const myAddr = `${messageId ?? "?"}:${partIndex ?? 0}:${localTagIdx}`;
        const winning = artifactLatestAddress?.get(s.part.identifier);
        const superseded = winning != null && winning !== myAddr;
        return <ArtifactCard key={i} part={s.part} superseded={superseded} />;
      })}
    </div>
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export const PartRenderer = memo(function PartRenderer({ part, isStreaming, messageId, partIndex }: PartRendererProps) {
  const { t } = useTranslation();
  switch (part.type) {
    case "text": {
      const p = part as TextPart;
      if (p.text.startsWith("[📎")) {
        const firstNewline = p.text.indexOf("\n");
        const header = firstNewline >= 0 ? p.text.slice(0, firstNewline) : p.text;
        const body = firstNewline >= 0 ? p.text.slice(firstNewline + 1) : "";
        const match = header.match(/^\[📎\s+(.+?)\]?$/);
        const filename = match?.[1] ?? header;
        return <AttachmentTextBlock filename={filename} content={body} />;
      }
      return <ArtifactAwareText text={p.text} messageId={messageId} partIndex={partIndex} />;
    }

    case "reasoning": {
      const p = part as ReasoningPart;
      return <ReasoningBlock content={p.reasoning} isStreaming={isStreaming} />;
    }

    case "tool-invocation": {
      const { toolInvocation } = part as ToolInvocationPart;

      if (toolInvocation.state === "result") {
        if (toolInvocation.result != null) {
          return (
            <ToolResult
              toolName={toolInvocation.toolName}
              result={toolInvocation.result}
              isError={toolInvocation.isError}
            />
          );
        }
        return (
          <ToolActivity
            toolName={toolInvocation.toolName}
            state="result"
            args={toolInvocation.args}
          />
        );
      }

      return (
        <ToolActivity
          toolName={toolInvocation.toolName}
          state={toolInvocation.state}
          args={toolInvocation.args}
        />
      );
    }

    case "task-card": {
      const p = part as unknown as TaskCardProps;
      return <TaskCard {...p} />;
    }

    case "status-toast": {
      const p = part as StatusToastPart;
      return (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
          {p.done ? (
            <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          )}
          <span>{p.status}</span>
        </div>
      );
    }

    case "compact-boundary": {
      const p = part as CompactBoundaryPart;
      return (
        <div className="my-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>
            {t("part.compactBoundary")}
            {typeof p.savedTokens === "number" && p.savedTokens > 0
              ? ` · ${p.savedTokens.toLocaleString()} tokens`
              : ""}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      );
    }

    case "prompt-suggestion": {
      const p = part as PromptSuggestionPart;
      return (
        <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1">{p.suggestion}</span>
        </div>
      );
    }

    case "ask-user-question": {
      const p = part as AskUserQuestionPart;
      return <AskUserQuestionForm part={p} />;
    }

    case "artifact": {
      const p = part as ArtifactPart;
      return <ArtifactCard part={p} />;
    }

    default:
      return null;
  }
});

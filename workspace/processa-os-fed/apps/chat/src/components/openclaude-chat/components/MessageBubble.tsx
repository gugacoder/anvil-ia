import { memo, useState, useCallback } from "react";
import type { Message, TurnMetadata } from "../types.js";
import { cn } from "../lib/utils.js";
import { Markdown } from "./Markdown.js";
import { StreamingIndicator } from "./StreamingIndicator.js";
import { PartRenderer } from "../parts/PartRenderer.js";
import { PartErrorBoundary } from "../parts/PartErrorBoundary.js";
import { Copy, Check, Clock, Coins, Cpu } from "lucide-react";
import { useTranslation } from "../i18n/index.js";

export interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  /** Show turn metadata footer (duration, cost, tokens, model). Default: true. */
  enableTurnMeta?: boolean;
  /** Show "..." indicator while streaming. Default: true. */
  enableStreamingIndicator?: boolean;
  className?: string;
}

function extractText(message: Message): string {
  if (message.content) return message.content;
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => (p as { type: string }).type === "text")
    .map((p) => p.text)
    .join("\n");
}

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-lg transition-all",
        "text-muted-foreground/50 opacity-0 group-hover/bubble:opacity-100",
        "hover:bg-muted/50 hover:text-muted-foreground",
      )}
      aria-label={copied ? t("bubble.copied") : t("bubble.copy")}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function EmptyResponse() {
  const { t } = useTranslation();
  return <span className="text-xs italic text-muted-foreground">{t("bubble.emptyResponse")}</span>;
}

function TurnFooter({ meta }: { meta: TurnMetadata }) {
  const { t } = useTranslation();
  const items: Array<{ icon: typeof Clock; text: string }> = [];

  if (meta.durationMs != null) {
    const secs = (meta.durationMs / 1000).toFixed(1);
    items.push({ icon: Clock, text: `${secs}s` });
  }

  if (meta.costUsd != null) {
    const cost = meta.costUsd < 0.01
      ? `$${meta.costUsd.toFixed(4)}`
      : `$${meta.costUsd.toFixed(3)}`;
    items.push({ icon: Coins, text: cost });
  }

  if (meta.inputTokens != null || meta.outputTokens != null) {
    const parts: string[] = [];
    if (meta.inputTokens != null) parts.push(`${formatTokens(meta.inputTokens)} ${t("bubble.tokenIn")}`);
    if (meta.outputTokens != null) parts.push(`${formatTokens(meta.outputTokens)} ${t("bubble.tokenOut")}`);
    if (meta.cachedTokens != null && meta.cachedTokens > 0) parts.push(`${formatTokens(meta.cachedTokens)} ${t("bubble.tokenCached")}`);
    items.push({ icon: Cpu, text: parts.join(" / ") });
  }

  if (meta.model) {
    items.push({ icon: Cpu, text: meta.model });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
      {items.map(({ icon: Icon, text }, i) => (
        <span key={i} className="flex items-center gap-1">
          <Icon className="size-3" />
          {text}
        </span>
      ))}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export const MessageBubble = memo(function MessageBubble({ message, isStreaming, enableTurnMeta = true, enableStreamingIndicator = true, className }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasParts = Array.isArray(message.parts) && message.parts.length > 0;
  const hasText = typeof message.content === "string" && message.content.length > 0;
  const isEmptyAssistant = !isUser && !hasParts && !hasText && !isStreaming;

  return (
    <div className={cn("group/bubble", isUser ? "flex flex-col items-end" : "flex flex-col items-start")}>
      {/* Bubble */}
      <div
        className={cn(
          "min-w-0 overflow-hidden",
          isUser
            ? "max-w-[80%] rounded-lg rounded-br-sm bg-muted text-foreground px-4 py-2.5"
            : "w-full text-foreground py-1",
          className
        )}
      >
        {hasParts
          ? <div className="flex flex-col gap-3">
              {(message.parts as { type: string }[]).map((part, i) => (
                <PartErrorBoundary key={i} label={`part:${part.type}`}>
                  <PartRenderer
                    part={part as Parameters<typeof PartRenderer>[0]["part"]}
                    isStreaming={isStreaming}
                    messageId={message.id}
                    partIndex={i}
                  />
                </PartErrorBoundary>
              ))}
            </div>
          : hasText
            ? <Markdown>{message.content}</Markdown>
            : isEmptyAssistant
              ? <EmptyResponse />
              : null
        }
        {enableStreamingIndicator && isStreaming && !isUser && <StreamingIndicator />}
      </div>

      {/* Action bar + turn footer — outside bubble, below */}
      {!isStreaming && (
        <div className={cn(
          "flex items-center gap-0.5 mt-0.5",
          isUser ? "justify-end" : "justify-start"
        )}>
          <CopyButton text={extractText(message)} />
        </div>
      )}
      {!isUser && enableTurnMeta && message.turnMeta && !isStreaming && (
        <TurnFooter meta={message.turnMeta} />
      )}
    </div>
  );
}, (prev, next) =>
  prev.message === next.message
  && prev.message.turnMeta === next.message.turnMeta
  && prev.isStreaming === next.isStreaming
  && prev.enableTurnMeta === next.enableTurnMeta
  && prev.enableStreamingIndicator === next.enableStreamingIndicator
  && prev.className === next.className
);

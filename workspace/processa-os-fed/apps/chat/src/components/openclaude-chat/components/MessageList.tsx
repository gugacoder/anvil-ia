import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useRef, useEffect, useMemo, useCallback, useState, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Sparkles, Loader2 } from "lucide-react";
import type { Message } from "../types.js";
import { MessageBubble } from "./MessageBubble.js";
import { StreamingIndicator } from "./StreamingIndicator.js";
import { ErrorNote } from "./ErrorNote.js";
import { ScrollBar } from "../ui/scroll-area.js";
import { cn } from "../lib/utils.js";
import { useTranslation } from "../i18n/index.js";

export interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
  error?: Error;
  onRetry?: () => void;
  emptyState?: ReactNode;
  /** Whether there are older messages to load. */
  hasMore?: boolean;
  /** Called when the user scrolls near the top and hasMore is true. */
  onLoadMore?: () => void;
  /** Whether older messages are currently being loaded. */
  isLoadingMore?: boolean;
  /** Show turn metadata footer (duration, cost, tokens, model). Default: true. */
  enableTurnMeta?: boolean;
  /** Show "..." indicator while waiting for assistant. Default: true. */
  enableStreamingIndicator?: boolean;
}

function LoadingOlder() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" />
      <span>{t("chat.loadingOlder")}</span>
    </div>
  );
}

function ConversationStart() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
      <span>{t("chat.conversationStart")}</span>
    </div>
  );
}

function DefaultWelcome() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Sparkles className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">{t("chat.welcomeTitle")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("chat.welcomeDescription")}
        </p>
      </div>
    </div>
  );
}

export function MessageList({ messages, isLoading, className, error, onRetry, emptyState, hasMore, onLoadMore, isLoadingMore, enableTurnMeta, enableStreamingIndicator = true }: MessageListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const isFollowingRef = useRef(true);
  const loadMoreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastAssistantIndex = useMemo(() =>
    messages.reduceRight((found, msg, i) => {
      if (found !== -1) return found;
      return msg.role === "assistant" ? i : -1;
    }, -1),
    [messages]
  );

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 80,
    overscan: 5,
    paddingStart: 16,
  });

  // Track scroll position to detect if user is following + trigger load more
  const handleScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    isFollowingRef.current = distanceFromBottom <= 100;

    // Infinite scroll reverse: load more when near top
    if (hasMore && !isLoadingMore && onLoadMore && viewport.scrollTop < 200) {
      if (loadMoreDebounceRef.current) clearTimeout(loadMoreDebounceRef.current);
      loadMoreDebounceRef.current = setTimeout(() => {
        onLoadMore();
        loadMoreDebounceRef.current = null;
      }, 300);
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll to bottom when following
  useEffect(() => {
    if (messages.length > 0 && isFollowingRef.current) {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
    }
  }, [messages, virtualizer]);

  // Auto-scroll when error appears
  useEffect(() => {
    if (error && isFollowingRef.current) {
      const viewport = viewportRef.current;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [error]);

  const virtualItems = virtualizer.getVirtualItems();

  if (messages.length === 0) {
    return (
      <ScrollAreaPrimitive.Root className={cn("flex-1 relative overflow-hidden", className)}>
        <ScrollAreaPrimitive.Viewport ref={viewportRef} className="h-full w-full rounded-[inherit]">
          {emptyState ?? <DefaultWelcome />}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    );
  }

  return (
    <ScrollAreaPrimitive.Root className={cn("flex-1 relative overflow-hidden", className)}>
      <ScrollAreaPrimitive.Viewport ref={viewportRef} className="h-full w-full rounded-[inherit]">
        {/* Load more indicator / conversation start */}
        {isLoadingMore && (
          <LoadingOlder />
        )}
        {!isLoadingMore && hasMore === false && messages.length > 0 && (
          <ConversationStart />
        )}

        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() + 16 }}
        >
          <div>
            {virtualItems.map((virtualRow) => {
              const message = messages[virtualRow.index];
              return (
                <div
                  key={message.id ?? virtualRow.index}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="pb-3 px-4"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <MessageBubble
                    message={message}
                    isStreaming={virtualRow.index === lastAssistantIndex && isLoading && messages[messages.length - 1]?.role === "assistant"}
                    enableTurnMeta={enableTurnMeta}
                    enableStreamingIndicator={enableStreamingIndicator}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {enableStreamingIndicator && isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="px-4 pb-3">
            <StreamingIndicator />
          </div>
        )}
        {!isLoading && error && (
          <div className="px-4 pb-3">
            <ErrorNote message={error.message} onRetry={onRetry} />
          </div>
        )}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

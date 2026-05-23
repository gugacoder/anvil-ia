import React, { useCallback, useMemo, useState } from "react"
import { cn } from "../lib/utils.js"
import { TooltipProvider } from "../ui/tooltip.js"
import { Separator } from "../ui/separator.js"
import { ScrollArea } from "../ui/scroll-area.js"
import { HistorySearch } from "./history/HistorySearch.js"
import { HistoryGroup } from "./history/HistoryGroup.js"
import { HistoryDeleteDialog } from "./history/HistoryDeleteDialog.js"
import { HistoryNewButton } from "./history/HistoryNewButton.js"
import { useHistoryData, createLocalStorageTransport } from "./history/useHistoryData.js"
import { createDefaultTransport, type ChatTransport } from "../transport.js"
import { useHistoryContext } from "../hooks/HistoryProvider.js"
import { LocaleProvider, useTranslation, resolveLocale } from "../i18n/index.js"
import type { CustomMessages, CustomLocaleInfo } from "../i18n/index.js"

export interface HistoryProps {
  /** Base URL for the default transport. Ignored if `transport` is provided. */
  endpoint?: string
  /** Bearer token for the default transport. Ignored if `transport` is provided. */
  token?: string
  /** Custom transport — overrides endpoint/token. */
  transport?: ChatTransport
  /** Currently active conversation id. */
  activeConversationId?: string | null
  /** Called when user selects a conversation. */
  onSelectConversation?: (id: string) => void
  /** Called when user creates a new conversation. Receives the new session id. */
  onNewConversation?: (id: string) => void
  /** Called after a conversation is deleted. */
  onDeleteConversation?: (id: string) => void
  /**
   * Called after a conversation is renamed (via the History panel's item menu).
   * Receives the new title. Useful for consumers that derive URLs from the
   * title (canonical slugs) and need to rewrite the router path.
   *
   * Not fired when rename happens via `<ChatHeader>` / `<ChatActionsMenu>` —
   * those have their own `onRename` prop that the consumer wires separately.
   */
  onRenameConversation?: (id: string, newTitle: string) => void
  /** Locale for UI strings (accepts "pt-BR", "pt_br", "pt", etc). */
  locale?: string
  /** Translation overrides keyed by locale slug. */
  messages?: CustomMessages
  /** Metadata for custom locales. */
  locales?: CustomLocaleInfo
  /** When defined, History is controlled by the host. Hides the internal search input. */
  searchQuery?: string
  /** Called when the internal input changes (uncontrolled) or proxies external changes (controlled). */
  onSearchChange?: (q: string) => void
  /** Hide the internal search input even when uncontrolled (host renders its own input elsewhere). */
  hideSearchInput?: boolean
  className?: string
}

/** Wrapper that provides LocaleProvider, then renders the content. */
export function History({ locale: localeProp, messages, locales, ...rest }: HistoryProps) {
  const resolvedLocale = resolveLocale(localeProp)
  return (
    <LocaleProvider locale={resolvedLocale} messages={messages} locales={locales}>
      <HistoryContent {...rest} />
    </LocaleProvider>
  )
}

function HistoryContent({
  endpoint,
  token,
  transport: customTransport,
  activeConversationId: customActiveId,
  onSelectConversation: customOnSelect,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  searchQuery: externalSearchQuery,
  onSearchChange,
  hideSearchInput,
  className,
}: Omit<HistoryProps, "locale">) {
  const { t } = useTranslation()

  // Try to read tudo que o Provider possa fornecer (agentId, transport,
  // active conversation, registerRefresh). Props diretas têm precedência.
  let ctxAgentId: string | undefined
  let ctxRegisterRefresh: ((fn: () => Promise<void>) => void) | undefined
  let ctxTransport: ChatTransport | undefined
  let ctxActiveId: string | null | undefined
  let ctxSetActive: ((id: string | null) => void) | undefined
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useHistoryContext()
    ctxAgentId = ctx.agentId
    ctxRegisterRefresh = ctx.registerRefresh
    ctxTransport = ctx.transport
    ctxActiveId = ctx.activeConversationId
    ctxSetActive = ctx.setActiveConversation
  } catch {
    // Not inside HistoryProvider — props diretas viram a única fonte.
  }

  // Resolve transport: prop > context > default (endpoint) > localStorage mock
  const transport = useMemo(() => {
    if (customTransport) {
      if (endpoint) {
        console.warn(
          "[openclaude-chat] History: both `transport` and `endpoint` were provided. " +
          "`endpoint` and `token` are ignored when `transport` is set.",
        )
      }
      return customTransport
    }
    if (ctxTransport) return ctxTransport
    if (endpoint) return createDefaultTransport(endpoint, token)
    return createLocalStorageTransport()
  }, [customTransport, ctxTransport, endpoint, token])

  // Resolve active id e onSelect: prop > context > undefined.
  const activeConversationId =
    customActiveId !== undefined ? customActiveId : (ctxActiveId ?? null)
  const onSelectConversation = customOnSelect ?? ctxSetActive

  const {
    filteredGroups,
    searchQuery,
    setSearchQuery,
    isLoading,
    createConversation,
    renameConversation,
    deleteConversation,
    toggleStar,
  } = useHistoryData(transport, {
    agentId: ctxAgentId,
    registerRefresh: ctxRegisterRefresh,
    externalSearchQuery,
    onExternalSearchChange: onSearchChange,
  })

  const isSearchControlled = externalSearchQuery !== undefined
  const showInternalSearch = !hideSearchInput && !isSearchControlled

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const handleNew = useCallback(async () => {
    const sessionId = await createConversation()
    onNewConversation?.(sessionId)
    onSelectConversation?.(sessionId)
  }, [createConversation, onNewConversation, onSelectConversation])

  const handleSelect = useCallback(
    (id: string) => onSelectConversation?.(id),
    [onSelectConversation],
  )

  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      await renameConversation(id, newTitle)
      onRenameConversation?.(id, newTitle)
    },
    [renameConversation, onRenameConversation],
  )

  const handleDeleteRequest = useCallback(
    (id: string) => {
      for (const g of filteredGroups) {
        const c = g.conversations.find((x) => x.id === id)
        if (c) {
          setDeleteTarget({ id, title: c.title })
          return
        }
      }
    },
    [filteredGroups],
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    await deleteConversation(deleteTarget.id)
    onDeleteConversation?.(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, deleteConversation, onDeleteConversation])

  const handleDeleteCancel = useCallback(() => setDeleteTarget(null), [])

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex h-full flex-col", className)}>
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <span className="text-sm font-semibold">{t("history.title")}</span>
          <HistoryNewButton onNew={handleNew} />
        </div>

        <Separator />

        {/* Search */}
        {showInternalSearch && (
          <>
            <div className="shrink-0 py-2">
              <HistorySearch value={searchQuery} onChange={setSearchQuery} />
            </div>
            <Separator />
          </>
        )}

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 p-1.5">
            {isLoading && filteredGroups.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                {t("history.loading")}
              </div>
            )}

            {!isLoading && filteredGroups.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                {searchQuery ? t("history.noResults") : t("history.empty")}
              </div>
            )}

            {filteredGroups.map((group) => (
              <HistoryGroup
                key={group.label}
                group={group}
                activeId={activeConversationId}
                onSelect={handleSelect}
                onRename={handleRename}
                onDelete={handleDeleteRequest}
                onToggleStar={toggleStar}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Delete confirmation */}
        <HistoryDeleteDialog
          open={deleteTarget !== null}
          title={deleteTarget?.title ?? ""}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      </div>
    </TooltipProvider>
  )
}

import React, { useCallback, useEffect, useRef, useState } from "react"
import { MoreHorizontal, Pencil, Star, StarOff, Trash2 } from "lucide-react"
import { cn } from "../../lib/utils.js"
import { useTranslation } from "../../i18n/index.js"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../ui/context-menu.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu.js"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip.js"
import type { Conversation } from "./types.js"

// ── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(iso: string, justNow: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return justNow
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ── Component ────────────────────────────────────────────────────────────

interface HistoryItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
}

export function HistoryItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onToggleStar,
}: HistoryItemProps) {
  const { t } = useTranslation()
  const { id, title, starred, messageCount, updatedAt } = conversation
  const [isRenaming, setIsRenaming] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) {
      setDraft(title)
      // Timeout to let the DOM render the input before focusing
      const t = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
      return () => clearTimeout(t)
    }
  }, [isRenaming, title])

  const commitRename = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) {
      onRename(id, trimmed)
    }
    setIsRenaming(false)
  }, [draft, title, id, onRename])

  const cancelRename = useCallback(() => {
    setDraft(title)
    setIsRenaming(false)
  }, [title])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        commitRename()
      } else if (e.key === "Escape") {
        e.preventDefault()
        cancelRename()
      }
    },
    [commitRename, cancelRename],
  )

  const menuItems = (
    <>
      <DropdownMenuItem onClick={() => setIsRenaming(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        {t("history.rename")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onToggleStar(id)}>
        {starred ? (
          <>
            <StarOff className="mr-2 h-4 w-4" />
            {t("history.unfavorite")}
          </>
        ) : (
          <>
            <Star className="mr-2 h-4 w-4" />
            {t("history.favorite")}
          </>
        )}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => onDelete(id)}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {t("history.delete")}
      </DropdownMenuItem>
    </>
  )

  const contextMenuItems = (
    <>
      <ContextMenuItem onClick={() => setIsRenaming(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        {t("history.rename")}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onToggleStar(id)}>
        {starred ? (
          <>
            <StarOff className="mr-2 h-4 w-4" />
            {t("history.unfavorite")}
          </>
        ) : (
          <>
            <Star className="mr-2 h-4 w-4" />
            {t("history.favorite")}
          </>
        )}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => onDelete(id)}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {t("history.delete")}
      </ContextMenuItem>
    </>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={() => !isRenaming && onSelect(id)}
          className={cn(
            "group relative flex w-full min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50",
            isActive && "bg-accent",
          )}
        >
          {/* Active indicator bar */}
          {isActive && (
            <div className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary" />
          )}

          {/* Row 1: star + title + menu */}
          <div className="flex min-w-0 items-center gap-2">
            {starred && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                </TooltipTrigger>
                <TooltipContent side="top">{t("history.favorited")}</TooltipContent>
              </Tooltip>
            )}

            {isRenaming ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            ) : (
              <span className="flex-1 truncate font-medium">{title}</span>
            )}

            {/* Dropdown trigger — visible on hover or when active */}
            {!isRenaming && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <span
                    role="button"
                    tabIndex={0}
                    className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 data-[state=open]:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation() }}
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {menuItems}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Row 2: metadata */}
          {!isRenaming && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{messageCount} {messageCount === 1 ? t("history.message") : t("history.messages")}</span>
              <span>&middot;</span>
              <span>{timeAgo(updatedAt, t("history.justNow"))}</span>
            </div>
          )}
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        {contextMenuItems}
      </ContextMenuContent>
    </ContextMenu>
  )
}

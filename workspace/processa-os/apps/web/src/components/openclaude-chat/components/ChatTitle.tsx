import React, { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react"
import { cn } from "../lib/utils.js"

export interface ChatTitleHandle {
  /** Start inline-rename mode. Consumer calls this from a menu, etc. */
  startRename: () => void
  /** Cancel rename mode without commit. */
  cancelRename: () => void
}

export interface ChatTitleProps {
  /** Current title. When undefined, nothing is rendered. */
  title?: string
  /** Called when the user commits a new (non-empty, different) title. */
  onRename?: (title: string) => void
  /**
   * When true, clicking the title enters rename mode. Default: false.
   * Keep false if you rename via an explicit menu item; the ref API is
   * the canonical trigger.
   */
  clickToRename?: boolean
  className?: string
}

/**
 * Renders the conversation title. Enters inline-rename mode either via
 * the exposed ref (`titleRef.current.startRename()`) or, if enabled,
 * via click on the title.
 *
 * Commit on Enter / blur. Cancel on Escape. Empty or unchanged input
 * does not fire onRename.
 */
export const ChatTitle = forwardRef<ChatTitleHandle, ChatTitleProps>(function ChatTitle(
  { title, onRename, clickToRename = false, className },
  ref,
) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draft, setDraft] = useState(title ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) {
      setDraft(title ?? "")
      const t = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
      return () => clearTimeout(t)
    }
  }, [isRenaming, title])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) onRename?.(trimmed)
    setIsRenaming(false)
  }, [draft, title, onRename])

  const cancel = useCallback(() => {
    setDraft(title ?? "")
    setIsRenaming(false)
  }, [title])

  useImperativeHandle(
    ref,
    () => ({
      startRename: () => setIsRenaming(true),
      cancelRename: cancel,
    }),
    [cancel],
  )

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); commit() }
      else if (e.key === "Escape") { e.preventDefault(); cancel() }
    },
    [commit, cancel],
  )

  if (title === undefined) return null

  if (isRenaming) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        className={cn(
          "min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className,
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        "truncate text-sm font-medium",
        clickToRename && "cursor-text",
        className,
      )}
      onClick={clickToRename ? () => setIsRenaming(true) : undefined}
    >
      {title}
    </span>
  )
})

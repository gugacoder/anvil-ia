import React, { useCallback, useRef } from "react"
import { cn } from "../lib/utils.js"
import { LocaleSelect } from "./LocaleSelect.js"
import { TooltipProvider } from "../ui/tooltip.js"
import { ChatTitle, type ChatTitleHandle } from "./ChatTitle.js"
import { ChatStarButton } from "./ChatStarButton.js"
import { ChatActionsMenu } from "./ChatActionsMenu.js"

export interface ChatHeaderProps {
  /** Slot rendered at the far left, before star/title. Use for sidebar toggle, etc. */
  leftContent?: React.ReactNode
  /** Conversation title. When undefined, session-dependent elements are hidden. */
  title?: string
  /** Whether the conversation is starred/bookmarked. */
  starred?: boolean
  /** Called when user toggles the star. */
  onToggleStar?: () => void
  /** Called when user renames the conversation. */
  onRename?: (title: string) => void
  /** Show agent avatar+name instead of star+title. */
  showAgent?: boolean
  /** Agent avatar URL. Only used when showAgent=true. */
  agentAvatar?: string
  /** Agent display name. Only used when showAgent=true. */
  agentName?: string
  /** Current locale slug. */
  locale?: string
  /** Called when user changes locale. */
  onLocaleChange?: (locale: string) => void
  /** Show locale selector. Default: true. */
  enableLocaleSelect?: boolean
  className?: string
}

/**
 * Compound header composing ChatTitle + ChatStarButton + ChatActionsMenu +
 * LocaleSelect into the layout used by the default demo. Back-compat:
 * public API unchanged. Internally delegates to the standalone subparts,
 * so consumers who don't want this layout can import each subpart
 * independently and place them anywhere (breadcrumb, toolbar, etc.).
 */
export function ChatHeader({
  leftContent,
  title,
  starred,
  onToggleStar,
  onRename,
  showAgent,
  agentAvatar,
  agentName,
  locale,
  onLocaleChange,
  enableLocaleSelect = true,
  className,
}: ChatHeaderProps) {
  const hasSession = title !== undefined
  const titleRef = useRef<ChatTitleHandle>(null)

  const handleRenameClick = useCallback(() => {
    titleRef.current?.startRename()
  }, [])

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex h-14 shrink-0 items-center justify-between border-b px-3",
          className,
        )}
      >
        {/* Left: leftContent slot + star/title or agent avatar */}
        <div className="flex min-w-0 items-center gap-1.5">
          {leftContent}
          {hasSession && showAgent ? (
            <>
              {agentAvatar && (
                <img
                  src={agentAvatar}
                  alt={agentName ?? "Agent"}
                  className="h-6 w-6 shrink-0 rounded-full"
                />
              )}
              {agentName && (
                <span className="truncate text-sm font-medium">{agentName}</span>
              )}
            </>
          ) : hasSession ? (
            <>
              <ChatStarButton starred={starred} onToggle={onToggleStar} />
              <ChatTitle ref={titleRef} title={title} onRename={onRename} />
            </>
          ) : (
            leftContent && null
          )}
        </div>

        {/* Right: locale selector + actions menu */}
        <div className="flex shrink-0 items-center gap-0.5">
          {enableLocaleSelect && locale && onLocaleChange && (
            <LocaleSelect value={locale} onChange={onLocaleChange} />
          )}
          {hasSession && (
            <ChatActionsMenu
              starred={starred}
              onRename={handleRenameClick}
              onToggleStar={onToggleStar}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

import React from "react"
import { Pencil, Star, StarOff } from "lucide-react"
import { cn } from "../lib/utils.js"
import { useMediaQuery } from "../hooks/useMediaQuery.js"
import { useTranslation } from "../i18n/index.js"
import { ChatActionsMenu, type ChatActionsMenuProps } from "./ChatActionsMenu.js"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "../ui/drawer.js"
import { Button } from "../ui/button.js"
import { MoreHorizontal } from "lucide-react"

export interface ChatActionsResponsiveProps
  extends Pick<ChatActionsMenuProps, "starred" | "onRename" | "onToggleStar" | "className"> {
  /**
   * Media query that decides desktop vs mobile rendering. When true:
   * desktop (DropdownMenu). When false: mobile (bottom Drawer).
   * Default: "(min-width: 1024px)".
   */
  breakpoint?: string
  /**
   * Controlled open state (mobile drawer only — desktop DropdownMenu
   * manages its own). When provided together with `onOpenChange`, the
   * component switches to controlled mode and **does not render a trigger
   * button** — consumer renders its own trigger and calls `onOpenChange(true)`.
   */
  open?: boolean
  /** Called when the drawer requests open/close in controlled mode. */
  onOpenChange?: (open: boolean) => void
}

/**
 * Viewport-responsive actions menu for a conversation:
 *   - Desktop: `<ChatActionsMenu>` (Radix DropdownMenu)
 *   - Mobile: Vaul bottom-Drawer with large-tap-target items
 *
 * Both branches render the same actions (rename, favorite) with identical
 * semantics — the wrapper is what changes.
 *
 * Pattern source: symmetric to `<HistoryResponsive>` per the atlas
 * overlay-responsivo-container-switch concept.
 */
export function ChatActionsResponsive({
  breakpoint = "(min-width: 1024px)",
  starred,
  onRename,
  onToggleStar,
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ChatActionsResponsiveProps) {
  const isDesktop = useMediaQuery(breakpoint)
  const { t } = useTranslation()
  const [internalOpen, setInternalOpen] = React.useState(false)

  // When both `open` and `onOpenChange` are provided, run in controlled mode
  // (no trigger button is rendered — consumer owns the trigger).
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined
  const open = isControlled ? (controlledOpen as boolean) : internalOpen
  const setOpen = isControlled ? (controlledOnOpenChange as (o: boolean) => void) : setInternalOpen

  if (isDesktop) {
    return (
      <ChatActionsMenu
        starred={starred}
        onRename={onRename}
        onToggleStar={onToggleStar}
        className={className}
      />
    )
  }

  const handle = (fn?: () => void) => () => {
    setOpen(false)
    fn?.()
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", className)}
            aria-label="Menu"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DrawerTrigger>
      )}
      <DrawerContent className="flex flex-col pb-[env(safe-area-inset-bottom)]">
        <DrawerTitle className="sr-only">Chat actions</DrawerTitle>
        <DrawerDescription className="sr-only">Conversation actions</DrawerDescription>
        <div className="flex flex-col gap-1 p-2">
          {onRename && (
            <button
              type="button"
              onClick={handle(onRename)}
              className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm hover:bg-accent active:bg-accent"
            >
              <Pencil className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span>{t("history.rename")}</span>
            </button>
          )}
          {onToggleStar && (
            <button
              type="button"
              onClick={handle(onToggleStar)}
              className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm hover:bg-accent active:bg-accent"
            >
              {starred ? (
                <>
                  <StarOff className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span>{t("history.unfavorite")}</span>
                </>
              ) : (
                <>
                  <Star className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span>{t("history.favorite")}</span>
                </>
              )}
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

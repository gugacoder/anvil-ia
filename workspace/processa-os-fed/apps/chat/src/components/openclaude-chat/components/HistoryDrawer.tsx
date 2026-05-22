import React from "react"
import { cn } from "../lib/utils.js"
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "../ui/drawer.js"
import { History, type HistoryProps } from "./History.js"
import { useTranslation } from "../i18n/index.js"

export interface HistoryDrawerProps extends HistoryProps {
  /** Controlled open state. */
  open: boolean
  /** Called when the drawer requests to open/close (swipe, overlay click, etc). */
  onOpenChange: (open: boolean) => void
  /**
   * Max-height of the drawer content. Default: "92dvh" (matches the
   * mobile bottom-sheet pattern described in the responsive-overlay
   * atlas concept).
   */
  maxHeight?: string
  /** Extra className applied to the DrawerContent. */
  contentClassName?: string
}

/**
 * Vaul-based bottom drawer wrapping `<History>`. Mobile-optimal container
 * for the history overlay: grab-handle, swipe-to-close, up to 92dvh.
 *
 * Controlled-only (no embedded trigger button). Consumer renders its own
 * trigger wherever fits — breadcrumb, toolbar, FAB, etc.
 */
export function HistoryDrawer({
  open,
  onOpenChange,
  maxHeight = "92dvh",
  contentClassName,
  ...historyProps
}: HistoryDrawerProps) {
  const { t } = useTranslation()
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn("flex flex-col", contentClassName)}
        style={{ maxHeight }}
      >
        <DrawerTitle className="sr-only">{t("history.title")}</DrawerTitle>
        <DrawerDescription className="sr-only">{t("history.title")}</DrawerDescription>
        <div className="flex min-h-0 flex-1 flex-col">
          <History {...historyProps} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

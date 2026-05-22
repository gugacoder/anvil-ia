import React from "react"
import { useMediaQuery } from "../hooks/useMediaQuery.js"
import { HistoryDrawer, type HistoryDrawerProps } from "./HistoryDrawer.js"
import { HistorySheet, type HistorySheetProps } from "./HistorySheet.js"

export interface HistoryResponsiveProps
  extends Omit<HistoryDrawerProps, "maxHeight" | "contentClassName">,
    Omit<HistorySheetProps, "side" | "width" | "contentClassName" | "open" | "onOpenChange" | keyof React.ComponentProps<"div">> {
  /**
   * Media query that decides which container renders. When it matches,
   * the desktop Sheet is used; otherwise the mobile Drawer.
   * Default: "(min-width: 1024px)".
   */
  breakpoint?: string
  /** Max-height for the mobile drawer. Default: "92dvh". */
  drawerMaxHeight?: string
  /** Side for the desktop sheet. Default: "right". */
  sheetSide?: "top" | "right" | "bottom" | "left"
  /** Width for the desktop sheet. Default: "440px". */
  sheetWidth?: string
  /** Extra className applied to whichever container renders. */
  contentClassName?: string
}

/**
 * Viewport-responsive history overlay: bottom-drawer on mobile (Vaul),
 * side-sheet on desktop (Radix Dialog). Content is `<History>` in both.
 *
 * Pattern source: kb/atlas/concepts/overlay-responsivo-container-switch.md
 * — same overlay concept, different container per viewport.
 *
 * Controlled-only (consumer owns `open` / `onOpenChange`). The trigger
 * lives wherever the consumer wants (breadcrumb, toolbar, FAB).
 */
export function HistoryResponsive({
  breakpoint = "(min-width: 1024px)",
  drawerMaxHeight,
  sheetSide,
  sheetWidth,
  contentClassName,
  open,
  onOpenChange,
  ...historyProps
}: HistoryResponsiveProps) {
  const isDesktop = useMediaQuery(breakpoint)

  if (isDesktop) {
    return (
      <HistorySheet
        open={open}
        onOpenChange={onOpenChange}
        side={sheetSide}
        width={sheetWidth}
        contentClassName={contentClassName}
        {...historyProps}
      />
    )
  }

  return (
    <HistoryDrawer
      open={open}
      onOpenChange={onOpenChange}
      maxHeight={drawerMaxHeight}
      contentClassName={contentClassName}
      {...historyProps}
    />
  )
}

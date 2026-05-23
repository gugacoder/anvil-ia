import React from "react"
import { useMediaQuery } from "../hooks/useMediaQuery.js"
import { HistoryDrawer, type HistoryDrawerProps } from "./HistoryDrawer.js"
import { HistorySheet, type HistorySheetProps } from "./HistorySheet.js"
import { useHistoryContext } from "../hooks/HistoryProvider.js"

export interface HistoryResponsiveProps
  extends Omit<HistoryDrawerProps, "maxHeight" | "contentClassName" | "open" | "onOpenChange">,
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
  /** Override the context-wired drawerOpen. Optional. */
  open?: boolean
  /** Override the context-wired setDrawerOpen. Optional. */
  onOpenChange?: (open: boolean) => void
}

/**
 * Viewport-responsive history overlay: bottom-drawer on mobile (Vaul),
 * side-sheet on desktop (Radix Dialog). Content is `<History>` in both.
 *
 * Auto-wires to HistoryProvider context: reads `drawerOpen` / `setDrawerOpen`
 * by default, falls back to provided `open` / `onOpenChange` if passed.
 *
 * Silences itself when a `<HistorySidebar>` (or any docked History) is
 * mounted in the same provider scope — that container becomes the
 * authoritative History surface and the overlay would just duplicate it.
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
  const { drawerOpen, setDrawerOpen, dockedCount } = useHistoryContext()

  if (dockedCount > 0) return null

  const effectiveOpen = open ?? drawerOpen
  const effectiveOnOpenChange = onOpenChange ?? setDrawerOpen

  if (isDesktop) {
    return (
      <HistorySheet
        open={effectiveOpen}
        onOpenChange={effectiveOnOpenChange}
        side={sheetSide}
        width={sheetWidth}
        contentClassName={contentClassName}
        {...historyProps}
      />
    )
  }

  return (
    <HistoryDrawer
      open={effectiveOpen}
      onOpenChange={effectiveOnOpenChange}
      maxHeight={drawerMaxHeight}
      contentClassName={contentClassName}
      {...historyProps}
    />
  )
}

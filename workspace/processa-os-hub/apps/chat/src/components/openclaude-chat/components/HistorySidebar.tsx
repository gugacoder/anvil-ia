import React from "react"
import { cn } from "../lib/utils.js"
import { History, type HistoryProps } from "./History.js"

export interface HistorySidebarProps extends HistoryProps {
  /** Width of the sidebar. Default: "280px". */
  width?: string
}

/**
 * Opt-in "classic" sidebar look: fixed-width column with right border and
 * background. Wraps `<History>` without changing its props.
 *
 * Use this when you want History persistently docked on the side of the
 * main content (the pre-refactor default). For overlay patterns, see
 * `<HistoryDrawer>`, `<HistorySheet>`, or `<HistoryResponsive>`.
 */
export function HistorySidebar({
  width = "280px",
  className,
  ...historyProps
}: HistorySidebarProps) {
  return (
    <div
      className={cn("flex h-full shrink-0 flex-col border-r bg-background", className)}
      style={{ width }}
    >
      <History {...historyProps} />
    </div>
  )
}

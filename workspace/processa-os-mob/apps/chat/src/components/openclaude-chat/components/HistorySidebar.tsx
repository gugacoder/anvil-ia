import React, { useEffect } from "react"
import { cn } from "../lib/utils.js"
import { History, type HistoryProps } from "./History.js"
import { useHistoryContext } from "../hooks/HistoryProvider.js"

export interface HistorySidebarProps extends HistoryProps {
  /** Width of the sidebar. Default: "280px". */
  width?: string
}

/**
 * Opt-in "classic" sidebar look: fixed-width column with right border and
 * background. Wraps `<History>` without changing its props.
 *
 * Registers itself as a docked container in HistoryProvider so HistoryTrigger
 * routes toggles to `sidebarOpen` (collapse/expand) and HistoryResponsive
 * silences itself in this scope. Visibility follows `sidebarOpen` from
 * context — returns null when collapsed.
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
  const { sidebarOpen, registerDocked } = useHistoryContext()

  useEffect(() => registerDocked(), [registerDocked])

  return (
    <div
      className={cn("flex h-full shrink-0 flex-col border-r bg-background", className)}
      style={{ width, display: sidebarOpen ? undefined : "none" }}
    >
      <History {...historyProps} />
    </div>
  )
}

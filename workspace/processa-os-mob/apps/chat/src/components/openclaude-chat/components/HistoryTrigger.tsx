import React from "react"
import { PanelLeft, PanelLeftClose } from "lucide-react"
import { Button } from "../ui/button.js"
import { useHistoryContext } from "../hooks/HistoryProvider.js"

export interface HistoryTriggerProps {
  className?: string
}

/**
 * Button that toggles History visibility. Routes to the right state slot
 * based on whether a docked container (`<HistorySidebar>`) is mounted in
 * the same provider scope:
 *
 *   - docked present → toggles `sidebarOpen` (collapse/expand the sidebar)
 *   - no docked      → toggles `drawerOpen` (open/close the overlay)
 *
 * Place inside a HistoryProvider, typically in the ChatHeader's
 * leftContent slot.
 */
export function HistoryTrigger({ className }: HistoryTriggerProps) {
  const {
    sidebarOpen,
    setSidebarOpen,
    drawerOpen,
    setDrawerOpen,
    dockedCount,
  } = useHistoryContext()

  const hasDocked = dockedCount > 0
  const isOpen = hasDocked ? sidebarOpen : drawerOpen
  const toggle = () =>
    hasDocked ? setSidebarOpen(!sidebarOpen) : setDrawerOpen(!drawerOpen)

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className ?? "h-8 w-8 shrink-0"}
      onClick={toggle}
    >
      {isOpen ? (
        <PanelLeftClose className="h-4 w-4" />
      ) : (
        <PanelLeft className="h-4 w-4" />
      )}
    </Button>
  )
}

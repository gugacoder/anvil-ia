import React from "react"
import { PanelLeft, PanelLeftClose } from "lucide-react"
import { Button } from "../ui/button.js"
import { useHistoryContext } from "../hooks/HistoryProvider.js"

export interface HistoryTriggerProps {
  className?: string
}

/**
 * Button that toggles the sidebar open/close state via HistoryProvider context.
 * Place inside a HistoryProvider, typically in the ChatHeader's leftContent slot.
 */
export function HistoryTrigger({ className }: HistoryTriggerProps) {
  const { sidebarOpen, setSidebarOpen } = useHistoryContext()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className ?? "h-8 w-8 shrink-0"}
      onClick={() => setSidebarOpen(!sidebarOpen)}
    >
      {sidebarOpen ? (
        <PanelLeftClose className="h-4 w-4" />
      ) : (
        <PanelLeft className="h-4 w-4" />
      )}
    </Button>
  )
}

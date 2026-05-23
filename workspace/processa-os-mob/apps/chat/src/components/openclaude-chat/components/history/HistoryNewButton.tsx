import React from "react"
import { MessageSquarePlus } from "lucide-react"
import { Button } from "../../ui/button.js"
import { cn } from "../../lib/utils.js"

export interface HistoryNewButtonProps {
  /** Handler called when user clicks to create a new conversation. */
  onNew: () => void
  /** Rendered children (overrides default icon). */
  children?: React.ReactNode
  /** Button variant passed to the underlying shadcn Button. */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  /** Button size. Default: "icon". */
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  "aria-label"?: string
}

/**
 * Standalone "new conversation" button. Can be placed inside a breadcrumb,
 * toolbar, or inside the History content — same handler, same visual.
 */
export function HistoryNewButton({
  onNew,
  children,
  variant = "ghost",
  size = "icon",
  className,
  "aria-label": ariaLabel,
}: HistoryNewButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(size === "icon" && "h-8 w-8", className)}
      onClick={onNew}
      aria-label={ariaLabel ?? "New conversation"}
    >
      {children ?? <MessageSquarePlus className="h-4 w-4" />}
    </Button>
  )
}

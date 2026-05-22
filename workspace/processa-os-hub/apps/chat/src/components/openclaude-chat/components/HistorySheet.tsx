import React from "react"
import { cn } from "../lib/utils.js"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "../ui/sheet.js"
import { History, type HistoryProps } from "./History.js"
import { useTranslation } from "../i18n/index.js"

export interface HistorySheetProps extends HistoryProps {
  /** Controlled open state. */
  open: boolean
  /** Called when the sheet requests to open/close (overlay click, Esc, etc). */
  onOpenChange: (open: boolean) => void
  /** Which edge the sheet slides in from. Default: "right". */
  side?: "top" | "right" | "bottom" | "left"
  /** Width of the sheet (for left/right sides). Default: "440px". */
  width?: string
  /** Extra className applied to the SheetContent. */
  contentClassName?: string
}

/**
 * Radix-Dialog-based lateral sheet wrapping `<History>`. Desktop-optimal
 * container for the history overlay: slides over main content from the
 * right (by default), with shadow and overlay.
 *
 * Controlled-only. Consumer renders its own trigger.
 */
export function HistorySheet({
  open,
  onOpenChange,
  side = "right",
  width = "440px",
  contentClassName,
  ...historyProps
}: HistorySheetProps) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn("flex flex-col p-0 sm:max-w-none", contentClassName)}
        style={(side === "left" || side === "right") ? { width } : undefined}
      >
        <SheetTitle className="sr-only">{t("history.title")}</SheetTitle>
        <SheetDescription className="sr-only">{t("history.title")}</SheetDescription>
        <div className="flex min-h-0 flex-1 flex-col">
          <History {...historyProps} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

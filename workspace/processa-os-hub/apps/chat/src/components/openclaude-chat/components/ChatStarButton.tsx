import React from "react"
import { Star } from "lucide-react"
import { cn } from "../lib/utils.js"
import { Button } from "../ui/button.js"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../ui/tooltip.js"
import { useTranslation } from "../i18n/index.js"

export interface ChatStarButtonProps {
  /** Whether the conversation is currently starred/favorited. */
  starred?: boolean
  /** Called when the user toggles the star. */
  onToggle?: () => void
  /**
   * When true, renders a Tooltip around the button. Default: true.
   * Set to false when embedding inside a breadcrumb or toolbar that
   * already provides hover affordances elsewhere.
   */
  withTooltip?: boolean
  /** Side for the tooltip. Default: "bottom". */
  tooltipSide?: "top" | "right" | "bottom" | "left"
  className?: string
}

/**
 * Star-toggle button for a conversation. Exported as a standalone subpart
 * so consumers can drop it into their own breadcrumb / action bar / menu.
 */
export function ChatStarButton({
  starred,
  onToggle,
  withTooltip = true,
  tooltipSide = "bottom",
  className,
}: ChatStarButtonProps) {
  const { t } = useTranslation()

  const button = (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 shrink-0", className)}
      onClick={onToggle}
      aria-label={starred ? t("history.unfavorite") : t("history.favorite")}
    >
      <Star
        className={cn(
          "h-4 w-4",
          starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
        )}
      />
    </Button>
  )

  if (!withTooltip) return button

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          {starred ? t("history.unfavorite") : t("history.favorite")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

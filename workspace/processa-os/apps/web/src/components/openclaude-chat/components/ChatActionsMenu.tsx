import React from "react"
import { MoreHorizontal, Pencil, Star, StarOff } from "lucide-react"
import { cn } from "../lib/utils.js"
import { Button } from "../ui/button.js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js"
import { useTranslation } from "../i18n/index.js"

export interface ChatActionsMenuProps {
  /** Whether the conversation is currently starred. */
  starred?: boolean
  /** Called when the user picks "Rename" from the menu. */
  onRename?: () => void
  /** Called when the user toggles the star via the menu. */
  onToggleStar?: () => void
  /**
   * Alignment of the dropdown content relative to the trigger. Default: "end".
   */
  align?: "start" | "center" | "end"
  className?: string
}

/**
 * Desktop actions menu (rename + favorite) for a conversation, as a
 * shadcn DropdownMenu. Standalone subpart — drop into breadcrumb,
 * toolbar, or compose inside ChatHeader.
 *
 * For mobile/responsive equivalent (bottom-drawer with tappable items),
 * see `<ChatActionsResponsive>` (same semantics, different container).
 */
export function ChatActionsMenu({
  starred,
  onRename,
  onToggleStar,
  align = "end",
  className,
}: ChatActionsMenuProps) {
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", className)}
          aria-label="Menu"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        {onRename && (
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("history.rename")}
          </DropdownMenuItem>
        )}
        {onToggleStar && (
          <DropdownMenuItem onClick={onToggleStar}>
            {starred ? (
              <>
                <StarOff className="mr-2 h-4 w-4" />
                {t("history.unfavorite")}
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                {t("history.favorite")}
              </>
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

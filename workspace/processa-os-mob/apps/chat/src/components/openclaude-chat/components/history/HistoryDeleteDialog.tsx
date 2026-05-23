import React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog.js"
import { useTranslation } from "../../i18n/index.js"

interface HistoryDeleteDialogProps {
  open: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export function HistoryDeleteDialog({ open, title, onConfirm, onCancel }: HistoryDeleteDialogProps) {
  const { t } = useTranslation()
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("history.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{title}&rdquo; {t("history.deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t("history.deleteCancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("history.deleteConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

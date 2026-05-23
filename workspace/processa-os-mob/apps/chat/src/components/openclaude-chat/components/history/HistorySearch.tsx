import React from "react"
import { Search, X } from "lucide-react"
import { cn } from "../../lib/utils.js"
import { useTranslation } from "../../i18n/index.js"

interface HistorySearchProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function HistorySearch({ value, onChange, className }: HistorySearchProps) {
  const { t } = useTranslation()
  return (
    <div className={cn("relative px-3", className)}>
      <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("history.search")}
        className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

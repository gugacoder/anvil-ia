import React from "react"
import type { Conversation, ConversationGroup } from "./types.js"
import { HistoryItem } from "./HistoryItem.js"

interface HistoryGroupProps {
  group: ConversationGroup
  activeId: string | null
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
}

export function HistoryGroup({
  group,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onToggleStar,
}: HistoryGroupProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
      </div>
      {group.conversations.map((c) => (
        <HistoryItem
          key={c.id}
          conversation={c}
          isActive={c.id === activeId}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onToggleStar={onToggleStar}
        />
      ))}
    </div>
  )
}

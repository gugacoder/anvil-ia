export interface Conversation {
  id: string
  title: string
  starred: boolean
  messageCount: number
  createdAt: string  // ISO 8601
  updatedAt: string  // ISO 8601
}

export interface ConversationGroup {
  label: string
  conversations: Conversation[]
}

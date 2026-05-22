import { useCallback, useEffect, useRef, useState } from "react"
import type { ChatTransport } from "../../transport.js"
import type { Message } from "../../types.js"
import type { Conversation, ConversationGroup } from "./types.js"
import { useTranslation } from "../../i18n/index.js"
import type { TranslationKeys } from "../../i18n/index.js"

// ── Agrupamento temporal ─────────────────────────────────────────────────

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function groupConversations(items: Conversation[], t: (key: keyof TranslationKeys) => string): ConversationGroup[] {
  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = todayStart - 86_400_000
  const weekStart = todayStart - (now.getDay() * 86_400_000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  const starred: Conversation[] = []
  const today: Conversation[] = []
  const yesterday: Conversation[] = []
  const thisWeek: Conversation[] = []
  const thisMonth: Conversation[] = []
  const older: Conversation[] = []

  // Sort by updatedAt desc
  const sorted = [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  for (const c of sorted) {
    if (c.starred) {
      starred.push(c)
      continue
    }
    const ts = new Date(c.updatedAt).getTime()
    if (ts >= todayStart) today.push(c)
    else if (ts >= yesterdayStart) yesterday.push(c)
    else if (ts >= weekStart) thisWeek.push(c)
    else if (ts >= monthStart) thisMonth.push(c)
    else older.push(c)
  }

  const groups: ConversationGroup[] = []
  if (starred.length) groups.push({ label: t("history.favorited"), conversations: starred })
  if (today.length) groups.push({ label: t("history.today"), conversations: today })
  if (yesterday.length) groups.push({ label: t("history.yesterday"), conversations: yesterday })
  if (thisWeek.length) groups.push({ label: t("history.thisWeek"), conversations: thisWeek })
  if (thisMonth.length) groups.push({ label: t("history.thisMonth"), conversations: thisMonth })
  if (older.length) groups.push({ label: t("history.older"), conversations: older })
  return groups
}

// ── localStorage transport (mock para demo) ──────────────────────────────

const STORAGE_KEY = "openclaude-history"
const MESSAGES_KEY_PREFIX = "openclaude-messages-"

function readStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Conversation[]) : []
  } catch {
    return []
  }
}

/** Event name dispatched on window whenever localStorage history changes. */
const HISTORY_CHANGE_EVENT = "openclaude-history-change"

function writeStorage(items: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  // Notify same-tab listeners (StorageEvent only fires cross-tab)
  window.dispatchEvent(new CustomEvent(HISTORY_CHANGE_EVENT))
}

function readMessages(conversationId: string): Message[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY_PREFIX + conversationId)
    return raw ? (JSON.parse(raw) as Message[]) : []
  } catch {
    return []
  }
}

export function writeMessages(conversationId: string, messages: Message[]) {
  localStorage.setItem(MESSAGES_KEY_PREFIX + conversationId, JSON.stringify(messages))
}

/** ChatTransport backed by localStorage — used when no transport is provided. */
export function createLocalStorageTransport(): ChatTransport {
  return {
    async listConversations() {
      return readStorage()
    },

    async createConversation() {
      const items = readStorage()
      const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const c: Conversation = {
        id,
        title: "New conversation",
        starred: false,
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      writeStorage([c, ...items])
      return { sessionId: id }
    },

    async getConversation(id) {
      const c = readStorage().find((x) => x.id === id)
      if (!c) throw new Error(`Conversation ${id} not found`)
      return c
    },

    async updateConversation(id, data) {
      const items = readStorage()
      const idx = items.findIndex((c) => c.id === id)
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() }
        writeStorage(items)
      }
    },

    async deleteConversation(id) {
      writeStorage(readStorage().filter((c) => c.id !== id))
      try { localStorage.removeItem(MESSAGES_KEY_PREFIX + id) } catch { /* noop */ }
    },

    async exportConversation() {
      return new Blob(["{}"], { type: "application/json" })
    },

    async getMessages(id, params) {
      const all = readMessages(id)
      const limit = Math.min(params?.limit ?? 50, 200)
      const beforeCursor = params?.before

      if (!beforeCursor) {
        // Return latest messages
        const start = Math.max(0, all.length - limit)
        const messages = all.slice(start)
        return {
          messages,
          hasMore: start > 0,
          cursor: start > 0 ? all[start]?.id ?? null : null,
        }
      }

      // Find cursor position and return messages before it
      const cursorIdx = all.findIndex((m) => m.id === beforeCursor)
      if (cursorIdx <= 0) {
        return { messages: [], hasMore: false, cursor: null }
      }
      const start = Math.max(0, cursorIdx - limit)
      const messages = all.slice(start, cursorIdx)
      return {
        messages,
        hasMore: start > 0,
        cursor: start > 0 ? all[start]?.id ?? null : null,
      }
    },

    sendMessage() {
      throw new Error("sendMessage not supported in localStorage transport")
    },

    getAttachmentUrl(_id, file) {
      return file
    },
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseHistoryDataReturn {
  conversations: Conversation[]
  groups: ConversationGroup[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  filteredGroups: ConversationGroup[]
  isLoading: boolean
  refresh: () => Promise<void>
  createConversation: () => Promise<string>
  renameConversation: (id: string, title: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>
}

export function useHistoryData(
  transport: ChatTransport,
  options?: {
    agentId?: string;
    registerRefresh?: (fn: () => Promise<void>) => void;
    /** When defined, search query is controlled externally (e.g. by a host shell). */
    externalSearchQuery?: string;
    /** Callback invoked when search changes while controlled externally. */
    onExternalSearchChange?: (q: string) => void;
  },
): UseHistoryDataReturn {
  const { t } = useTranslation()
  const transportRef = useRef(transport)
  transportRef.current = transport
  const agentIdRef = useRef(options?.agentId)
  agentIdRef.current = options?.agentId

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [internalSearchQuery, setInternalSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const isControlled = options?.externalSearchQuery !== undefined
  const searchQuery = isControlled ? (options!.externalSearchQuery as string) : internalSearchQuery
  const setSearchQuery = useCallback(
    (q: string) => {
      if (isControlled) options?.onExternalSearchChange?.(q)
      else setInternalSearchQuery(q)
    },
    [isControlled, options],
  )

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const items = await transportRef.current.listConversations(
        agentIdRef.current ? { agentId: agentIdRef.current } : undefined,
      )
      setConversations(items)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Register refresh in provider context so external consumers can trigger it (D-10)
  useEffect(() => {
    options?.registerRefresh?.(refresh)
  }, [refresh, options?.registerRefresh])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Auto-refresh when localStorage history changes (e.g. from ChatHeader actions)
  useEffect(() => {
    const handler = () => void refresh()
    window.addEventListener(HISTORY_CHANGE_EVENT, handler)
    return () => window.removeEventListener(HISTORY_CHANGE_EVENT, handler)
  }, [refresh])

  const groups = groupConversations(conversations, t)

  // Filtered (flat, no temporal grouping during search)
  const filteredGroups: ConversationGroup[] = searchQuery.trim()
    ? (() => {
        const q = searchQuery.toLowerCase()
        const matches = conversations
          .filter((c) => c.title.toLowerCase().includes(q))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        return matches.length ? [{ label: t("history.results"), conversations: matches }] : []
      })()
    : groups

  const createConversation = useCallback(async () => {
    const { sessionId } = await transportRef.current.createConversation(
      agentIdRef.current ? { agentId: agentIdRef.current } : undefined,
    )
    // Rename to locale-aware default title
    await transportRef.current.updateConversation(sessionId, { title: t("history.newConversation") })
    await refresh()
    return sessionId
  }, [refresh, t])

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      await transportRef.current.updateConversation(id, { title })
      await refresh()
    },
    [refresh],
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      await transportRef.current.deleteConversation(id)
      await refresh()
    },
    [refresh],
  )

  const toggleStar = useCallback(
    async (id: string) => {
      const c = conversations.find((x) => x.id === id)
      if (!c) return
      await transportRef.current.updateConversation(id, { starred: !c.starred })
      await refresh()
    },
    [conversations, refresh],
  )

  return {
    conversations,
    groups,
    searchQuery,
    setSearchQuery,
    filteredGroups,
    isLoading,
    refresh,
    createConversation,
    renameConversation,
    deleteConversation,
    toggleStar,
  }
}

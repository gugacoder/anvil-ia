import React, { createContext, useCallback, useContext, useRef, useState } from "react"
import type { ChatTransport } from "../transport.js"

export interface HistoryContextValue {
  activeConversationId: string | null
  setActiveConversation: (id: string | null) => void
  transport?: ChatTransport
  /** Agent ID scoped to this provider — flows to transport calls. */
  agentId?: string
  /** Sidebar open state (desktop/mobile). */
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  /**
   * Register a refresh callback (called by useHistoryData).
   * @internal — consumers should use `refresh()` instead.
   */
  registerRefresh: (fn: () => Promise<void>) => void
  /** Force refresh all components (re-list conversations, etc). */
  refresh: () => Promise<void>
}

const HistoryContext = createContext<HistoryContextValue | null>(null)

export interface HistoryProviderProps {
  children: React.ReactNode
  /** Optional custom transport passed down to History component. */
  transport?: ChatTransport
  /** Agent ID — scoped to conversations for this agent. */
  agentId?: string
  /** Initial active conversation (uncontrolled). */
  defaultConversationId?: string | null
  /** Controlled active conversation. */
  activeConversationId?: string | null
  /** Called when active conversation changes. */
  onActiveChange?: (id: string | null) => void
  /** Initial sidebar state. Default: true. */
  defaultSidebarOpen?: boolean
}

export function HistoryProvider({
  children,
  transport,
  agentId,
  defaultConversationId = null,
  activeConversationId: controlledId,
  onActiveChange,
  defaultSidebarOpen = true,
}: HistoryProviderProps) {
  const [uncontrolledId, setUncontrolledId] = useState<string | null>(defaultConversationId)
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen)
  const refreshRef = useRef<(() => Promise<void>) | null>(null)

  const isControlled = controlledId !== undefined
  const activeId = isControlled ? controlledId : uncontrolledId

  const setActiveConversation = useCallback(
    (id: string | null) => {
      if (!isControlled) setUncontrolledId(id)
      onActiveChange?.(id)
    },
    [isControlled, onActiveChange],
  )

  const registerRefresh = useCallback((fn: () => Promise<void>) => {
    refreshRef.current = fn
  }, [])

  const refresh = useCallback(async () => {
    await refreshRef.current?.()
  }, [])

  return (
    <HistoryContext.Provider
      value={{
        activeConversationId: activeId,
        setActiveConversation,
        transport,
        agentId,
        sidebarOpen,
        setSidebarOpen,
        registerRefresh,
        refresh,
      }}
    >
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistoryContext(): HistoryContextValue {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error("useHistoryContext must be used within HistoryProvider")
  return ctx
}

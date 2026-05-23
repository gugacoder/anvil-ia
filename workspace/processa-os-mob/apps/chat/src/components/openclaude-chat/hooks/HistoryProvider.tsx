import React, { createContext, useCallback, useContext, useRef, useState } from "react"
import type { ChatTransport } from "../transport.js"

export interface HistoryContextValue {
  activeConversationId: string | null
  setActiveConversation: (id: string | null) => void
  transport?: ChatTransport
  /** Agent ID scoped to this provider — flows to transport calls. */
  agentId?: string
  /** Docked sidebar visibility (HistorySidebar). Default true. */
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  /** Overlay visibility (HistoryDrawer/HistorySheet/HistoryResponsive). Default false. */
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  /**
   * Number of docked History containers currently mounted under this provider.
   * Containers (HistorySidebar) call registerDocked() on mount and run the
   * returned unregister on unmount. HistoryTrigger reads this to route the
   * toggle to sidebarOpen (docked) vs drawerOpen (overlay). HistoryResponsive
   * uses it to silence itself when a docked sibling is present.
   */
  dockedCount: number
  registerDocked: () => () => void
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
  /** Initial docked sidebar state. Default: true. */
  defaultSidebarOpen?: boolean
  /** Initial overlay state. Default: false. */
  defaultDrawerOpen?: boolean
}

export function HistoryProvider({
  children,
  transport,
  agentId,
  defaultConversationId = null,
  activeConversationId: controlledId,
  onActiveChange,
  defaultSidebarOpen = true,
  defaultDrawerOpen = false,
}: HistoryProviderProps) {
  const [uncontrolledId, setUncontrolledId] = useState<string | null>(defaultConversationId)
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen)
  const [drawerOpen, setDrawerOpen] = useState(defaultDrawerOpen)
  const [dockedCount, setDockedCount] = useState(0)
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

  const registerDocked = useCallback(() => {
    setDockedCount((n) => n + 1)
    return () => setDockedCount((n) => Math.max(0, n - 1))
  }, [])

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
        drawerOpen,
        setDrawerOpen,
        dockedCount,
        registerDocked,
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

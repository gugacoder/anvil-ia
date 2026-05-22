// Transport layer — abstrai a comunicacao HTTP dos componentes.
// Componentes nunca chamam fetch diretamente; usam um ChatTransport.

import type { Conversation } from "./components/history/types.js"
import type { Message, AskUserQuestionAnswers } from "./types.js"
import { convertSDKMessages, type SDKMessage } from "./lib/sdk-to-message.js"

// ── Tipos auxiliares ─────────────────────────────────────────────────────

export interface ConversationDetail extends Conversation {
  agentId?: string
}

export interface GetMessagesParams {
  /** Max messages to return. Default: 50, max: 200. */
  limit?: number
  /** Cursor — return messages before this point. Omit for latest messages. */
  before?: string
}

export interface GetMessagesResult {
  messages: Message[]
  /** true if there are older messages available. */
  hasMore: boolean
  /** Cursor for the next page (null if no more). */
  cursor: string | null
}

// ── Interface principal ──────────────────────────────────────────────────

export interface ChatTransport {
  // --- Conversas (History, TopBar) ---
  listConversations(params?: { agentId?: string }): Promise<Conversation[]>
  createConversation(params?: {
    agentId?: string
    options?: Record<string, unknown>
  }): Promise<{ sessionId: string }>
  getConversation(id: string): Promise<ConversationDetail>
  updateConversation(id: string, data: { title?: string; starred?: boolean }): Promise<void>
  deleteConversation(id: string): Promise<void>
  exportConversation(id: string, format?: "json" | "markdown"): Promise<Blob>

  // --- Mensagens (Chat) ---
  getMessages(conversationId: string, params?: GetMessagesParams): Promise<GetMessagesResult>
  sendMessage(
    conversationId: string,
    params: { content: string; attachments?: File[] },
  ): AsyncGenerator<unknown> | ReadableStream<unknown>
  getAttachmentUrl(conversationId: string, file: string): string

  // --- AskUserQuestion (tool nativa do CLI) ---
  /** Responde uma pergunta interativa. answers: { questionText: optionLabel }. */
  respondToAskUserQuestion?(
    conversationId: string,
    callId: string,
    response: AskUserQuestionAnswers,
  ): Promise<void>
  /** Cancela uma pergunta pendente (envia deny). */
  cancelAskUserQuestion?(conversationId: string, callId: string): Promise<void>
}

// ── Transport default (fetch) ────────────────────────────────────────────

export function createDefaultTransport(endpoint: string, token?: string): ChatTransport {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) baseHeaders["Authorization"] = `Bearer ${token}`

  async function request(method: string, path: string, body?: unknown): Promise<Response> {
    const res = await fetch(`${endpoint}${path}`, {
      method,
      headers: baseHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      throw new Error(`${method} ${path}: ${res.status} — ${errText}`)
    }
    return res
  }

  return {
    async listConversations(params) {
      const qs = params?.agentId ? `?agentId=${encodeURIComponent(params.agentId)}` : ""
      const res = await request("GET", `/conversations${qs}`)
      return res.json()
    },

    async createConversation(params) {
      const res = await request("POST", "/conversations", params)
      return res.json()
    },

    async getConversation(id) {
      const res = await request("GET", `/conversations/${encodeURIComponent(id)}`)
      return res.json()
    },

    async updateConversation(id, data) {
      await request("PATCH", `/conversations/${encodeURIComponent(id)}`, data)
    },

    async deleteConversation(id) {
      await request("DELETE", `/conversations/${encodeURIComponent(id)}`)
    },

    async exportConversation(id, format = "json") {
      const res = await request(
        "GET",
        `/conversations/${encodeURIComponent(id)}/export?format=${format}`,
      )
      return res.blob()
    },

    async getMessages(id, params) {
      const qs = new URLSearchParams()
      if (params?.limit) qs.set("limit", String(params.limit))
      if (params?.before) qs.set("before", params.before)
      const qsStr = qs.toString()
      const res = await request("GET", `/conversations/${encodeURIComponent(id)}/messages${qsStr ? `?${qsStr}` : ""}`)
      const data = (await res.json()) as {
        messages?: SDKMessage[]
        hasMore?: boolean
        cursor?: string | null
      }
      // Backbone devolve mensagens no formato SDK (JSONL do Claude CLI).
      // Convertemos para o formato Message do chat UI (parts, role, etc.)
      // para que o consumer receba dados prontos pra renderizar.
      const messages = convertSDKMessages(data.messages ?? [])
      return {
        messages,
        hasMore: data.hasMore ?? false,
        cursor: data.cursor ?? null,
      }
    },

    async *sendMessage(id, params) {
      const res = await fetch(`${endpoint}/conversations/${encodeURIComponent(id)}/messages`, {
        method: "POST",
        headers: { ...baseHeaders, Accept: "text/event-stream" },
        body: JSON.stringify({ message: params.content }),
      })
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(`POST /conversations/${id}/messages: ${res.status} — ${errText}`)
      }
      // Yield the ReadableStream body — the consumer (useOpenClaudeChat) handles SSE parsing
      yield res.body
    },

    getAttachmentUrl(id, file) {
      const tokenQs = token ? `?token=${encodeURIComponent(token)}` : ""
      return `${endpoint}/conversations/${encodeURIComponent(id)}/attachments/${encodeURIComponent(file)}${tokenQs}`
    },

    async respondToAskUserQuestion(id, callId, response) {
      await request(
        "POST",
        `/conversations/${encodeURIComponent(id)}/ask-user-question/${encodeURIComponent(callId)}`,
        response,
      )
    },

    async cancelAskUserQuestion(id, callId) {
      await request(
        "DELETE",
        `/conversations/${encodeURIComponent(id)}/ask-user-question/${encodeURIComponent(callId)}`,
      )
    },
  }
}

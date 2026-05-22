import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, MessagePart, ToolInvocationPart, TurnMetadata } from "../types.js";
import { extractTextFromParts, convertSDKMessages } from "../lib/sdk-to-message.js";
import type {
  ContentBlock,
  SDKAssistantMessage,
  SDKUserMessage,
  SDKResultMessage,
  SDKMessage,
} from "../lib/sdk-to-message.js";
import { createDefaultTransport, type ChatTransport } from "../transport.js";

// ─────────────────────────────────────────────────────────────────────────────

export interface UseOpenClaudeChatOptions {
  /** Base URL do servico que encapsula o openclaude-sdk. Ex: http://localhost:9500/api/v1/ai */
  endpoint: string;
  /** Optional bearer token. */
  token?: string;
  /**
   * ID de sessao live. Caso omitido, o hook cria uma sessao nova via POST /conversations
   * na primeira mensagem e expoe o id via `sessionId`.
   */
  sessionId?: string;
  /** Mensagens iniciais (historico) para hidratar a UI. */
  initialMessages?: Message[];
  /** Options extras passadas ao servidor na criacao da sessao. */
  sessionOptions?: Record<string, unknown>;
  /** Options por turno. Passado como `turnOptions` no body do /prompt. */
  turnOptions?: Record<string, unknown>;
  /** Modelo selecionado. Enviado como `model` no body de /conversations e /conversations/:id/messages. */
  model?: string;
  /**
   * Agent ID enviado como `agentId` no body do POST /conversations quando o hook
   * precisa criar uma sessao (i.e., `sessionId` foi omitido pelo consumer). Sem
   * isto, o servidor aplica seu default (`system.main`) — o que pode falhar com
   * 403 se a api-key do consumer nao autorizar esse agente. Sempre passe quando
   * souber qual agente a conversa pertence.
   */
  agentId?: string;
  /** Customiza fetch (ex: para injetar credenciais). */
  fetcher?: typeof fetch;
  /**
   * Timeout maximo (ms) para um turno completo. Safety net para evitar loading
   * infinito caso o servidor mantenha o stream vivo com pings mas nunca resolva.
   * Default: 600_000 (10 min).
   */
  maxTurnMs?: number;
  /**
   * Transport opcional pra carregar historico via `getMessages()`. Se ausente,
   * o hook deriva de `endpoint` automaticamente. Passar o seu transport e util
   * quando voce ja mantem um (e.g., compartilhado com `<History>`).
   */
  transport?: ChatTransport;
  /**
   * Quando `sessionId` e fornecido e `initialMessages` nao, o hook busca o
   * historico via `transport.getMessages(sessionId)` automaticamente.
   * Default: `true`. Desligue se voce gerencia o historico no consumer.
   */
  autoLoadHistory?: boolean;
  /**
   * Capabilities do cliente, enviadas no body do POST /conversations.
   * O servidor pode usar isso pra ligar/desligar features no SDK conforme
   * o que a UI suporta. Hoje suportado: `askUserQuestion`.
   */
  clientCapabilities?: { askUserQuestion?: boolean; artifacts?: boolean };
  /**
   * Habilita Artifacts — declara `clientCapabilities.artifacts: true` no
   * POST /conversations e ativa o parser de tags `<antArtifact>` no texto.
   * Default: false.
   */
  enableArtifacts?: boolean;
}

export interface UseOpenClaudeChatReturn {
  sessionId: string | null;
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  error: Error | null;
  handleSubmit: (e?: { preventDefault?: () => void }) => void;
  sendMessage: (text: string) => Promise<void>;
  stop: () => void;
  reload: () => Promise<void>;
  clear: () => void;
  /** Submit answers pra uma AskUserQuestion pendente. */
  respondToAskUserQuestion: (
    callId: string,
    response: { answers: Record<string, string>; annotations?: Record<string, { preview?: string; notes?: string }> },
  ) => Promise<void>;
  /** Cancela uma AskUserQuestion pendente. */
  cancelAskUserQuestion: (callId: string) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useOpenClaudeChat(options: UseOpenClaudeChatOptions): UseOpenClaudeChatReturn {
  const {
    endpoint,
    token,
    sessionId: providedSessionId,
    initialMessages,
    sessionOptions,
    turnOptions,
    model,
    agentId,
    fetcher,
    maxTurnMs = 600_000,
    transport: customTransport,
    autoLoadHistory = true,
    clientCapabilities,
    enableArtifacts = false,
  } = options;

  const [sessionId, setSessionId] = useState<string | null>(providedSessionId ?? null);
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastSentRef = useRef<string | null>(null);

  const doFetch = fetcher ?? fetch;

  // ──────────────────────────────────────────────────────────────
  // Auto-load do historico: quando sessionId e fornecido (ou trocado)
  // e o consumer NAO passou initialMessages, busca via transport.
  // Se autoLoadHistory=false, o consumer e responsavel.
  const initialMessagesProvided = initialMessages !== undefined;
  useEffect(() => {
    if (!autoLoadHistory) return;
    if (initialMessagesProvided) return;
    if (!providedSessionId) return;
    let cancelled = false;
    const transport = customTransport ?? createDefaultTransport(endpoint, token);
    (async () => {
      try {
        const result = await transport.getMessages(providedSessionId);
        if (cancelled) return;
        // O backbone pode mandar SDKMessages crus (precisa converter) OU
        // Messages ja convertidas. createDefaultTransport ja converte; um
        // transport custom pode devolver array vazio ou misto. Tratamos
        // pelo formato — se tem `parts`, e Message; senao tentamos converter.
        const items = result.messages as Array<Message | SDKMessage>;
        const looksLikeChatMessage = (m: unknown): m is Message =>
          typeof m === "object" && m !== null &&
          "parts" in (m as Record<string, unknown>) &&
          "role" in (m as Record<string, unknown>);
        const allChatMessages = items.every(looksLikeChatMessage);
        const final: Message[] = allChatMessages
          ? (items as Message[])
          : convertSDKMessages(items as SDKMessage[]);
        setMessages(final);
      } catch (err) {
        if (cancelled) return;
        console.warn("[openclaude-chat] auto-load history failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Deliberadamente NAO depende de customTransport pra nao re-fetchar a
    // cada render. autoLoadHistory + providedSessionId sao os disparos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providedSessionId, autoLoadHistory, initialMessagesProvided, endpoint, token]);

  // ──────────────────────────────────────────────────────────────
  // Garante sessao live
  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await doFetch(`${endpoint}/conversations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        options: sessionOptions ?? {},
        ...(model ? { model } : {}),
        ...(agentId ? { agentId } : {}),
        ...(clientCapabilities || enableArtifacts
          ? {
              clientCapabilities: {
                ...(clientCapabilities ?? {}),
                ...(enableArtifacts ? { artifacts: true } : {}),
              },
            }
          : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create session: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { sessionId: string };
    setSessionId(data.sessionId);
    return data.sessionId;
  }, [sessionId, endpoint, token, sessionOptions, model, agentId, clientCapabilities, enableArtifacts, doFetch]);

  // ──────────────────────────────────────────────────────────────
  // Stream parser — consome SSE do endpoint /conversations/:id/messages
  // Contrato: SEMPRE promove um assistantId no setMessages e SEMPRE retorna
  // o numero de partes acumuladas. O chamador decide se isso configura erro
  // (ex: zero partes = resposta vazia, mesmo com HTTP 200).
  const streamPrompt = useCallback(
    async (sid: string, text: string, assistantId: string): Promise<{ partCount: number; badFrames: number }> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // Watchdog de stall — se nao chegar NENHUM byte SSE (incluindo ping) em
      // STALL_MS, considera sessao morta e aborta. Subimos pra 90s pra tolerar
      // chat agentico (LLM pode pensar muito entre tool calls). O servidor
      // emite `event: ping` periodicamente como heartbeat — qualquer chunk SSE
      // (ping ou message) renova esse timer via armStall().
      const STALL_MS = 90_000;
      let stallTimer: ReturnType<typeof setTimeout> | null = null;
      const armStall = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          try { ctrl.abort(new Error("stall-timeout")); } catch { /* noop */ }
        }, STALL_MS);
      };
      const disarmStall = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = null;
      };

      armStall();
      let res: Response;
      try {
        res = await doFetch(`${endpoint}/conversations/${encodeURIComponent(sid)}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify({ message: text, turnOptions, ...(model ? { model } : {}) }),
          signal: ctrl.signal,
        });
      } catch (err) {
        disarmStall();
        throw err;
      }

      if (!res.ok || !res.body) {
        disarmStall();
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Buffer acumulado de partes — fonte da verdade para esta sessao de stream.
      // Mantemos fora do functional updater do setMessages (o React 19 StrictMode
      // chama o updater mais de uma vez e mutar estado compartilhado dentro dele
      // leva a blocos perdidos).
      const accumulatedParts: MessagePart[] = [];
      const toolPartByCallId = new Map<string, ToolInvocationPart>();
      const streamMeta: Partial<TurnMetadata> = {};

      const commit = () => {
        const snapshot = accumulatedParts.map((p) => ({ ...p }));
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === assistantId);
          if (idx === -1) return prev;
          const next = prev.slice();
          next[idx] = {
            ...prev[idx],
            parts: snapshot,
            content: extractTextFromParts(snapshot),
          };
          return next;
        });
      };

      let badFrames = 0;

      const handleEvent = (eventName: string, dataStr: string) => {
        if (eventName === "error") {
          try {
            const payload = JSON.parse(dataStr) as { message?: string; name?: string };
            throw new Error(payload.message ?? "Stream error");
          } catch (err) {
            throw err instanceof Error ? err : new Error(String(err));
          }
        }
        if (eventName === "done") return;
        // Heartbeat do servidor — `event: ping` apenas serve para manter o
        // stall watchdog renovado durante pausas longas do agente. Nao tem
        // payload util; o efeito ja foi aplicado no loop ao chamar armStall()
        // a cada chunk recebido. Apenas retornamos sem processar.
        if (eventName === "ping" || eventName === "keepalive" || eventName === "heartbeat") return;
        if (eventName !== "message") return;

        let msg: SDKMessage;
        try {
          msg = JSON.parse(dataStr) as SDKMessage;
        } catch {
          badFrames++;
          console.warn("[chat] frame SSE com JSON invalido ignorado:", dataStr.slice(0, 200));
          return;
        }

        if (msg.type === "assistant") {
          // Signal 1: nova mensagem do assistente chegou — todas as tools
          // anteriores ja terminaram (execucao sequencial). Assenta qualquer
          // tool_use ainda em "call"/"partial-call" para remover o spinner.
          // Tambem marca status-toasts como `done` (vira ✓ no PartRenderer).
          for (const p of accumulatedParts) {
            if (p.type === "tool-invocation") {
              const tip = p as ToolInvocationPart;
              if (tip.toolInvocation.state === "call" || tip.toolInvocation.state === "partial-call") {
                tip.toolInvocation = { ...tip.toolInvocation, state: "result", result: null };
              }
            }
            if (p.type === "status-toast") {
              (p as { done?: boolean }).done = true;
            }
          }

          const assistant = msg as SDKAssistantMessage;

          // Capture error from SDK message
          if (assistant.error) {
            accumulatedParts.push({
              type: "text",
              text: `⚠️ **${assistant.error.type}**: ${assistant.error.message}`,
            });
          }

          // Capture model info
          if (assistant.message?.model) {
            streamMeta.model = assistant.message.model;
          }

          const blocks = assistant.message?.content ?? [];
          for (const block of blocks) {
            if (block.type === "text") {
              accumulatedParts.push({ type: "text", text: block.text });
            } else if (block.type === "thinking") {
              accumulatedParts.push({ type: "reasoning", reasoning: (block as { thinking: string }).thinking });
            } else if (block.type === "tool_use") {
              if (toolPartByCallId.has(block.id)) continue;
              const part: ToolInvocationPart = {
                type: "tool-invocation",
                toolInvocation: {
                  toolName: block.name,
                  toolCallId: block.id,
                  state: "call",
                  args: block.input,
                },
              };
              toolPartByCallId.set(block.id, part);
              accumulatedParts.push(part);
            }
          }
          commit();
          return;
        }

        if (msg.type === "user") {
          // Normalmente traz tool_result com ref a tool_use anterior.
          const userMsg = msg as SDKUserMessage;
          const content = userMsg.message?.content;
          if (Array.isArray(content)) {
            let changed = false;
            for (const block of content as ContentBlock[]) {
              if (block.type === "tool_result") {
                const part = toolPartByCallId.get(block.tool_use_id);
                if (part) {
                  part.toolInvocation = {
                    ...part.toolInvocation,
                    state: "result",
                    result: block.content,
                    isError: block.is_error,
                  };
                  changed = true;
                }
              }
            }
            if (changed) commit();
          }
          return;
        }

        // Tool progress — update elapsed time on running tool
        if (msg.type === "tool_progress") {
          const tp = msg as { tool_use_id?: string; elapsed_ms?: number };
          if (tp.tool_use_id) {
            const part = toolPartByCallId.get(tp.tool_use_id);
            if (part && (part.toolInvocation.state === "call" || part.toolInvocation.state === "partial-call")) {
              part.toolInvocation = {
                ...part.toolInvocation,
                args: { ...part.toolInvocation.args, _elapsedMs: tp.elapsed_ms },
              };
              commit();
            }
          }
          return;
        }

        // Streaming granular — deltas character-by-character
        if (msg.type === "stream_event") {
          const event = (msg as { event?: { type?: string; index?: number; delta?: Record<string, unknown>; content_block?: Record<string, unknown> } }).event;
          if (!event) return;

          if (event.type === "content_block_start") {
            const block = event.content_block;
            if (!block) return;
            if (block.type === "text") {
              accumulatedParts.push({ type: "text", text: (block.text as string) ?? "" });
              commit();
            } else if (block.type === "thinking") {
              accumulatedParts.push({ type: "reasoning", reasoning: (block.thinking as string) ?? "" });
              commit();
            } else if (block.type === "tool_use") {
              const id = block.id as string;
              const name = block.name as string;
              if (id && name && !toolPartByCallId.has(id)) {
                const part: ToolInvocationPart = {
                  type: "tool-invocation",
                  toolInvocation: {
                    toolName: name,
                    toolCallId: id,
                    state: "partial-call",
                    args: {},
                  },
                };
                toolPartByCallId.set(id, part);
                accumulatedParts.push(part);
                commit();
              }
            }
            return;
          }

          if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (!delta) return;
            if (delta.type === "text_delta" && typeof delta.text === "string") {
              // Append to last text part
              const lastPart = accumulatedParts[accumulatedParts.length - 1];
              if (lastPart && lastPart.type === "text") {
                (lastPart as { type: "text"; text: string }).text += delta.text;
              } else {
                accumulatedParts.push({ type: "text", text: delta.text });
              }
              commit();
            } else if (delta.type === "thinking_delta" && typeof delta.thinking === "string") {
              const lastPart = accumulatedParts[accumulatedParts.length - 1];
              if (lastPart && lastPart.type === "reasoning") {
                (lastPart as { type: "reasoning"; reasoning: string }).reasoning += delta.thinking;
              } else {
                accumulatedParts.push({ type: "reasoning", reasoning: delta.thinking });
              }
              commit();
            } else if (delta.type === "input_json_delta" && typeof delta.partial_json === "string") {
              // Tool args being generated — accumulate JSON string
              // The final tool_use input comes with the full SDKAssistantMessage
              // This is just for live preview (partial-call state)
            }
            return;
          }

          if (event.type === "content_block_stop") {
            // Block finalized — will be confirmed by next SDKAssistantMessage
            return;
          }

          // message_start, message_stop — no-op for now
          return;
        }

        if (msg.type === "result") {
          const sdk = msg as SDKResultMessage;
          const meta: TurnMetadata = {
            ...streamMeta,
            costUsd: sdk.total_cost_usd,
            durationMs: sdk.duration_ms,
            isError: sdk.is_error,
          };
          if (sdk.usage) {
            meta.inputTokens = sdk.usage.input_tokens;
            meta.outputTokens = sdk.usage.output_tokens;
            meta.cachedTokens = sdk.usage.cache_read_input_tokens;
          }
          // Attach to the assistant message via setMessages
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantId);
            if (idx === -1) return prev;
            const next = prev.slice();
            next[idx] = { ...prev[idx], turnMeta: meta };
            return next;
          });
          return;
        }

        // Rate limit events
        if (msg.type === "rate_limit_event") {
          const rle = msg as { status?: string; utilization?: number; reset_at?: string };
          if (rle.status === "rejected") {
            accumulatedParts.push({
              type: "text",
              text: `⚠️ **Rate limit exceeded** — resets at ${rle.reset_at ?? "unknown"}`,
            });
            commit();
          }
          // allowed_warning — could show badge, but not critical for now
          return;
        }

        // AskUserQuestion request — emitido pelo bridge (custom event).
        if (msg.type === "ask_user_question_request") {
          const r = msg as { request?: { callId?: string; input?: { questions?: unknown[] } } };
          const req = r.request;
          if (req?.callId && Array.isArray(req.input?.questions)) {
            accumulatedParts.push({
              type: "ask-user-question",
              callId: req.callId,
              questions: req.input.questions,
            } as MessagePart);
            commit();
          }
          return;
        }
        // AskUserQuestion resolved — vem como replay (history) ou após POST.
        if (msg.type === "ask_user_question_resolved") {
          const r = msg as { callId?: string; response?: { answers?: Record<string, string>; annotations?: Record<string, unknown> }; cancelled?: boolean };
          if (r.callId) {
            for (const p of accumulatedParts) {
              if (p.type === "ask-user-question" && (p as { callId: string }).callId === r.callId) {
                if (r.cancelled) {
                  (p as { resolved?: unknown }).resolved = { cancelled: true };
                } else if (r.response) {
                  (p as { resolved?: unknown }).resolved = r.response;
                }
                (p as { submitting?: boolean }).submitting = false;
                (p as { error?: string }).error = undefined;
                break;
              }
            }
            commit();
          }
          return;
        }

        // Prompt suggestions
        if (msg.type === "prompt_suggestion") {
          const ps = msg as { suggestion?: string };
          if (ps.suggestion) {
            accumulatedParts.push({
              type: "prompt-suggestion",
              suggestion: ps.suggestion,
            } as MessagePart);
            commit();
          }
          return;
        }

        // Tool use summary
        if (msg.type === "tool_use_summary") {
          const tus = msg as { summary?: string };
          if (tus.summary) {
            accumulatedParts.push({
              type: "text",
              text: `> **Tool summary:** ${tus.summary}`,
            });
            commit();
          }
          return;
        }

        // System messages — task events, status, etc.
        if (msg.type === "system") {
          const sys = msg as { subtype?: string; description?: string; summary?: string; tool_uses?: number; total_tokens?: number; output_file?: string; status?: string };

          if (sys.subtype === "task_started" && sys.description) {
            accumulatedParts.push({
              type: "task-card",
              description: sys.description,
              status: "in_progress",
            } as MessagePart);
            commit();
          } else if (sys.subtype === "task_progress") {
            for (let i = accumulatedParts.length - 1; i >= 0; i--) {
              const p = accumulatedParts[i] as { type: string; toolUses?: number; totalTokens?: number };
              if (p.type === "task-card") {
                if (sys.tool_uses != null) p.toolUses = sys.tool_uses;
                if (sys.total_tokens != null) p.totalTokens = sys.total_tokens;
                commit();
                break;
              }
            }
          } else if (sys.subtype === "status") {
            // Status messages (e.g., "compacting", "Pensando…") —
            // consolidados num único pill. Se já existe um status-toast
            // pendente (`!done`), atualiza o texto in-place. Caso contrario,
            // empurra um novo. Evita stack visual de pills.
            const status = (sys as { status?: string }).status;
            if (status) {
              const existing = accumulatedParts.find(
                (p) => p.type === "status-toast" && !(p as { done?: boolean }).done,
              ) as { type: string; status: string; done?: boolean } | undefined;
              if (existing) {
                existing.status = status;
              } else {
                accumulatedParts.push({
                  type: "status-toast",
                  status,
                } as MessagePart);
              }
              commit();
            }
          } else if (sys.subtype === "compact_boundary") {
            // Compaction boundary — divider
            const savedTokens = (sys as { pre_tokens?: number }).pre_tokens;
            accumulatedParts.push({
              type: "compact-boundary",
              savedTokens,
            } as MessagePart);
            commit();
          } else if (sys.subtype === "local_command_output") {
            // Local command output
            const output = (sys as { output?: string }).output;
            if (output) {
              accumulatedParts.push({
                type: "text",
                text: output,
              });
              commit();
            }
          } else if (sys.subtype === "task_notification") {
            for (let i = accumulatedParts.length - 1; i >= 0; i--) {
              const p = accumulatedParts[i] as { type: string; status?: string; summary?: string; outputFile?: string };
              if (p.type === "task-card") {
                p.status = sys.status === "completed" ? "completed" : sys.status === "failed" ? "failed" : "stopped";
                if (sys.summary) p.summary = sys.summary;
                if (sys.output_file) p.outputFile = sys.output_file;
                commit();
                break;
              }
            }
          }
          return;
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          armStall(); // reset watchdog a cada chunk que chega
          buffer += decoder.decode(value, { stream: true });

          // SSE frames: "event: X\ndata: Y\n\n"
          let boundary: number;
          while ((boundary = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            let eventName = "message";
            const dataLines: string[] = [];
            for (const line of frame.split("\n")) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
            }
            if (dataLines.length === 0) continue;
            handleEvent(eventName, dataLines.join("\n"));
          }
        }
      } finally {
        disarmStall();
        abortRef.current = null;

        // Signal 2: stream terminou (sucesso, erro, abort, timeout) — assenta
        // qualquer tool_use residual para que o spinner nunca fique preso.
        let settled = false;
        for (const part of accumulatedParts) {
          if (part.type === "tool-invocation") {
            const tip = part as ToolInvocationPart;
            if (tip.toolInvocation.state === "call" || tip.toolInvocation.state === "partial-call") {
              tip.toolInvocation = { ...tip.toolInvocation, state: "result", result: null };
              settled = true;
            }
          }
        }
        if (settled) commit();
      }

      return { partCount: accumulatedParts.length, badFrames };
    },
    [endpoint, token, turnOptions, model, doFetch],
  );

  // ──────────────────────────────────────────────────────────────
  // Helper: garante que NUNCA fica uma bolha de assistant vazia pendurada.
  // Se o turno terminou em erro ou em stream vazio, removemos o placeholder
  // (para o ErrorNote abaixo da mensagem do usuario aparecer) ou injetamos
  // um bloco de texto com a mensagem de erro para o usuario.
  const dropEmptyAssistant = useCallback((assistantId: string | null) => {
    if (!assistantId) return;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === assistantId);
      if (idx === -1) return prev;
      const msg = prev[idx];
      if (msg.role === "assistant" && msg.parts.length === 0) {
        const next = prev.slice();
        next.splice(idx, 1);
        return next;
      }
      return prev;
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setError(null);
      lastSentRef.current = trimmed;

      const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userId,
          role: "user",
          content: trimmed,
          parts: [{ type: "text", text: trimmed }],
        },
      ]);

      setIsLoading(true);

      // Cria placeholder assistant ANTES de qualquer I/O — garante que o
      // assistantId esta disponivel para cleanup mesmo se ensureSession ou
      // streamPrompt falharem antes de retornar.
      const assistantId = `asst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", parts: [] },
      ]);

      // Safety net: timeout total do turno. Diferente do stall watchdog (que
      // reseta a cada byte recebido), este timer e absoluto — se o turno
      // inteiro exceder maxTurnMs, abortamos. Evita loading infinito quando
      // o servidor envia pings mas nunca resolve.
      let turnTimer: ReturnType<typeof setTimeout> | null = null;

      try {
        turnTimer = setTimeout(() => {
          try { abortRef.current?.abort(new Error("turn-timeout")); } catch { /* noop */ }
        }, maxTurnMs);

        const sid = await ensureSession();
        const { partCount, badFrames } = await streamPrompt(sid, trimmed, assistantId);
        if (partCount === 0) {
          // Servidor fechou o stream sem emitir nenhum bloco — erro "macio".
          const detail = badFrames > 0
            ? ` (${badFrames} frame(s) SSE com JSON invalido foram descartados)`
            : "";
          throw new Error(
            `O servidor nao retornou nenhum conteudo.${detail} Verifique se o provider de LLM esta configurado.`,
          );
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        // Aborts originados do `stop()` do usuario sao intencionais — nao viram erro.
        const isUserStop = e.name === "AbortError" && (e as Error & { __userStop?: boolean }).__userStop;
        if (!isUserStop) {
          // Se foi stall/timeout de abort, troca a mensagem por algo legivel.
          const msg =
            e.name === "AbortError"
              ? "Tempo esgotado aguardando resposta do servidor."
              : e.message || "Falha desconhecida ao processar mensagem.";
          setError(new Error(msg));
        }
        dropEmptyAssistant(assistantId);
      } finally {
        if (turnTimer) clearTimeout(turnTimer);
        setIsLoading(false);
      }
    },
    [isLoading, maxTurnMs, ensureSession, streamPrompt, dropEmptyAssistant],
  );

  const handleSubmit = useCallback(
    (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.();
      const text = input;
      setInput("");
      void sendMessage(text);
    },
    [input, sendMessage],
  );

  const stop = useCallback(() => {
    const err = new Error("User stopped stream");
    err.name = "AbortError";
    (err as Error & { __userStop?: boolean }).__userStop = true;
    abortRef.current?.abort(err);
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (!lastSentRef.current) return;
    // remove a ultima mensagem do assistant (se existir) antes de re-enviar
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return last.role === "assistant" ? prev.slice(0, -1) : prev;
    });
    await sendMessage(lastSentRef.current);
  }, [sendMessage]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    lastSentRef.current = null;
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // ─── AskUserQuestion: submit + cancel ──────────────────────────────────
  const updatePart = useCallback(
    (callId: string, patch: (p: Record<string, unknown>) => void) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.role !== "assistant") return m;
          let touched = false;
          const newParts = m.parts.map((p) => {
            if (p.type === "ask-user-question" && (p as { callId?: string }).callId === callId) {
              const next = { ...p } as Record<string, unknown>;
              patch(next);
              touched = true;
              return next as typeof p;
            }
            return p;
          });
          return touched ? { ...m, parts: newParts } : m;
        }),
      );
    },
    [],
  );

  const respondToAskUserQuestion = useCallback(
    async (callId: string, response: { answers: Record<string, string>; annotations?: Record<string, { preview?: string; notes?: string }> }) => {
      if (!sessionId) throw new Error("respondToAskUserQuestion: no sessionId");
      const transport = customTransport ?? createDefaultTransport(endpoint, token);
      if (!transport.respondToAskUserQuestion) {
        throw new Error("transport does not implement respondToAskUserQuestion");
      }
      updatePart(callId, (p) => {
        p.submitting = true;
        p.error = undefined;
      });
      try {
        await transport.respondToAskUserQuestion(sessionId, callId, response);
        updatePart(callId, (p) => {
          p.submitting = false;
          p.resolved = response;
          p.error = undefined;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        updatePart(callId, (p) => {
          p.submitting = false;
          p.error = message;
        });
        throw err;
      }
    },
    [sessionId, customTransport, endpoint, token, updatePart],
  );

  const cancelAskUserQuestion = useCallback(
    async (callId: string) => {
      if (!sessionId) throw new Error("cancelAskUserQuestion: no sessionId");
      const transport = customTransport ?? createDefaultTransport(endpoint, token);
      if (!transport.cancelAskUserQuestion) {
        throw new Error("transport does not implement cancelAskUserQuestion");
      }
      updatePart(callId, (p) => {
        p.submitting = true;
        p.error = undefined;
      });
      try {
        await transport.cancelAskUserQuestion(sessionId, callId);
        updatePart(callId, (p) => {
          p.submitting = false;
          p.resolved = { cancelled: true };
          p.error = undefined;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        updatePart(callId, (p) => {
          p.submitting = false;
          p.error = message;
        });
        throw err;
      }
    },
    [sessionId, customTransport, endpoint, token, updatePart],
  );

  return {
    sessionId,
    messages,
    input,
    setInput,
    isLoading,
    error,
    handleSubmit,
    sendMessage,
    stop,
    reload,
    clear,
    respondToAskUserQuestion,
    cancelAskUserQuestion,
  };
}

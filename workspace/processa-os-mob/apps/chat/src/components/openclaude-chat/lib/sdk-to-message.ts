// Converte SDKMessage[] (formato do backbone JSONL) em Message[] (formato do chat UI).
// Usado pelo transport.getMessages (batch) e pelo useOpenClaudeChat (streaming).

import type { Message, MessagePart, ToolInvocationPart, TurnMetadata } from "../types.js";

// ── SDK types (espelho minimo, sem dep dura) ────────────────────────

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: unknown;
  is_error?: boolean;
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

export interface SDKAssistantMessage {
  type: "assistant";
  uuid: string;
  session_id: string;
  message: {
    id: string;
    content: ContentBlock[];
    model?: string;
    stop_reason?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  parent_tool_use_id: string | null;
  error?: { type: string; message: string };
  isSynthetic?: boolean;
}

export interface SDKUserMessage {
  type: "user";
  session_id: string;
  message: { content: ContentBlock[] | unknown };
  parent_tool_use_id: string | null;
  isSynthetic?: boolean;
}

export interface SDKResultMessage {
  type: "result";
  subtype?: string;
  session_id: string;
  total_cost_usd?: number;
  duration_ms?: number;
  is_error?: boolean;
  num_turns?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
  };
  errors?: Array<{ message: string }>;
  permission_denials?: Array<{ tool: string; reason?: string }>;
}

export interface SDKSystemMessage {
  type: "system";
  subtype?: string;
  session_id: string;
  [k: string]: unknown;
}

export type SDKMessage =
  | SDKAssistantMessage
  | SDKUserMessage
  | SDKResultMessage
  | SDKSystemMessage
  | { type: string; [k: string]: unknown };

// ── Helpers ─────────────────────────────────────────────────────────

export function extractTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

let _seqId = 0;
function seqId(prefix: string): string {
  return `${prefix}-${++_seqId}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Batch converter (history) ───────────────────────────────────────

/**
 * Converte um array de SDKMessage (como armazenado no JSONL do backbone)
 * em Message[] prontas para o chat UI.
 *
 * Logica:
 * - SDKAssistantMessage(s) contiguos → acumula parts na mesma Message assistant
 * - SDKUserMessage com tool_result → atualiza ToolInvocationPart do assistant anterior
 * - SDKUserMessage com text (prompt do usuario) → nova Message user
 * - SDKResultMessage → attach TurnMetadata na ultima Message assistant
 * - isSynthetic → marca mas nao filtra (consumer decide)
 */
export function convertSDKMessages(sdkMessages: SDKMessage[]): Message[] {
  const result: Message[] = [];
  let currentAssistant: Message | null = null;
  const toolPartByCallId = new Map<string, ToolInvocationPart>();

  function finalizeAssistant() {
    if (currentAssistant) {
      // Settle any pending tool calls
      for (const part of currentAssistant.parts) {
        if (part.type === "tool-invocation") {
          const tip = part as ToolInvocationPart;
          if (tip.toolInvocation.state === "call" || tip.toolInvocation.state === "partial-call") {
            tip.toolInvocation = { ...tip.toolInvocation, state: "result", result: null };
          }
        }
      }
      currentAssistant.content = extractTextFromParts(currentAssistant.parts);
      currentAssistant = null;
    }
    toolPartByCallId.clear();
  }

  for (const msg of sdkMessages) {
    if (msg.type === "assistant") {
      const sdk = msg as SDKAssistantMessage;

      // Skip synthetic messages
      if (sdk.isSynthetic) continue;

      // Se nao tem parent_tool_use_id, e uma nova "rodada" do assistant.
      // Se tem, e continuacao (apos tool result). Ambos acumulam no mesmo Message.
      if (!currentAssistant) {
        currentAssistant = {
          id: sdk.uuid || seqId("asst"),
          role: "assistant",
          content: "",
          parts: [],
        };
        result.push(currentAssistant);
      }

      // Extract error from SDK message
      if (sdk.error) {
        currentAssistant.parts.push({
          type: "text",
          text: `⚠️ **${sdk.error.type}**: ${sdk.error.message}`,
        });
      }

      // Store model info for metadata
      if (sdk.message?.model) {
        currentAssistant.turnMeta = {
          ...currentAssistant.turnMeta,
          model: sdk.message.model,
        };
      }

      const blocks = sdk.message?.content ?? [];
      for (const block of blocks) {
        if (block.type === "text") {
          currentAssistant.parts.push({ type: "text", text: (block as TextBlock).text });
        } else if (block.type === "thinking") {
          currentAssistant.parts.push({ type: "reasoning", reasoning: (block as ThinkingBlock).thinking });
        } else if (block.type === "tool_use") {
          const tb = block as ToolUseBlock;
          if (toolPartByCallId.has(tb.id)) continue;
          const part: ToolInvocationPart = {
            type: "tool-invocation",
            toolInvocation: {
              toolName: tb.name,
              toolCallId: tb.id,
              state: "call",
              args: tb.input,
            },
          };
          toolPartByCallId.set(tb.id, part);
          currentAssistant.parts.push(part);
        }
      }
      continue;
    }

    if (msg.type === "user") {
      const sdk = msg as SDKUserMessage;

      // Skip synthetic
      if (sdk.isSynthetic) continue;

      const content = sdk.message?.content;

      // Check if this is a tool_result message or a real user message
      if (Array.isArray(content)) {
        const blocks = content as ContentBlock[];
        const hasToolResult = blocks.some((b) => b.type === "tool_result");

        if (hasToolResult && currentAssistant) {
          // Tool results — update existing tool parts
          for (const block of blocks) {
            if (block.type === "tool_result") {
              const tr = block as ToolResultBlock;
              const part = toolPartByCallId.get(tr.tool_use_id);
              if (part) {
                part.toolInvocation = {
                  ...part.toolInvocation,
                  state: "result",
                  result: tr.content,
                  isError: tr.is_error,
                };
              }
            }
          }
          continue;
        }

        // Real user message with text
        const textBlocks = blocks.filter((b): b is TextBlock => b.type === "text");
        if (textBlocks.length > 0) {
          finalizeAssistant();
          const text = textBlocks.map((b) => b.text).join("\n");
          result.push({
            id: seqId("user"),
            role: "user",
            content: text,
            parts: textBlocks.map((b) => ({ type: "text" as const, text: b.text })),
          });
          continue;
        }
      }

      // Simple string content (user prompt)
      if (typeof content === "string" && content.trim()) {
        finalizeAssistant();
        // Backbone (Claude CLI via openclaude-sdk) persiste user content com
        // wrapper `-\n...\n` — um delimitador interno do storage. No render
        // como markdown, o `-` no inicio de linha vira bullet list. Normalizamos
        // aqui: strip do prefix + trim no trailing newline.
        const normalized = content.replace(/^-\n/, "").replace(/\n$/, "");
        result.push({
          id: seqId("user"),
          role: "user",
          content: normalized,
          parts: [{ type: "text", text: normalized }],
        });
        continue;
      }

      // User message without identifiable content — skip
      continue;
    }

    if (msg.type === "result") {
      const sdk = msg as SDKResultMessage;
      // Attach metadata to the last assistant message
      if (currentAssistant) {
        const meta: TurnMetadata = {
          ...currentAssistant.turnMeta,
          costUsd: sdk.total_cost_usd,
          durationMs: sdk.duration_ms,
          numTurns: sdk.num_turns,
          isError: sdk.is_error,
          errors: sdk.errors,
        };
        if (sdk.usage) {
          meta.inputTokens = sdk.usage.input_tokens;
          meta.outputTokens = sdk.usage.output_tokens;
          meta.cachedTokens = sdk.usage.cache_read_input_tokens;
        }
        currentAssistant.turnMeta = meta;
      }
      finalizeAssistant();
      continue;
    }

    // Other types (system, etc.) — ignored for now
  }

  // Finalize any remaining assistant message
  finalizeAssistant();

  return result;
}

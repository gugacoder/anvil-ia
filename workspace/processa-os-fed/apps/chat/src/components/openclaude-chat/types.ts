// Tipos locais usados pelo @codrstudio/openclaude-chat.
// Nao depende de @ai-sdk/react. Modelo inspirado nos "parts" do ai-sdk,
// mas alimentado a partir de SDKMessage do @codrstudio/openclaude-sdk.

export type TextPart = { type: "text"; text: string };

export type ReasoningPart = { type: "reasoning"; reasoning: string };

export type ToolInvocationState = "call" | "partial-call" | "result";

export type ToolInvocationPart = {
  type: "tool-invocation";
  toolInvocation: {
    toolName: string;
    toolCallId: string;
    state: ToolInvocationState;
    args?: Record<string, unknown>;
    result?: unknown;
    isError?: boolean;
  };
};

export type ImageAttachmentPart = { type: "image"; _ref?: string; mimeType?: string };
export type FileAttachmentPart = { type: "file"; _ref?: string; mimeType?: string };

/** Inline status pill — usado pra comfort messages durante o turno
 * (ex: "Pensando…", "Acordando…"). `done=true` muda o ícone pra check. */
export type StatusToastPart = { type: "status-toast"; status: string; done?: boolean };

/** Divider visual emitido quando o CLI faz compactação automática. */
export type CompactBoundaryPart = { type: "compact-boundary"; savedTokens?: number };

/** Sugestão de próxima pergunta emitida pelo CLI. */
export type PromptSuggestionPart = { type: "prompt-suggestion"; suggestion: string };

/** Schema da tool nativa AskUserQuestion (1-4 perguntas multiple-choice). */
export interface AskUserQuestionOption {
  label: string;
  description: string;
  preview?: string;
}
export interface AskUserQuestionItem {
  question: string;
  header: string;
  options: AskUserQuestionOption[];
  multiSelect: boolean;
}
export interface AskUserQuestionAnnotation {
  preview?: string;
  notes?: string;
}
export interface AskUserQuestionAnswers {
  answers: Record<string, string>;
  annotations?: Record<string, AskUserQuestionAnnotation>;
}

/** Pergunta interativa emitida pelo agente — renderizada como form inline. */
export type AskUserQuestionPart = {
  type: "ask-user-question";
  callId: string;
  questions: AskUserQuestionItem[];
  /** Set quando o usuário respondeu OU cancelou. */
  resolved?: AskUserQuestionAnswers | { cancelled: true };
  /** True enquanto a resposta está sendo enviada ao server. */
  submitting?: boolean;
  /** Mensagem de erro se POST falhou. */
  error?: string;
};

/** Tipos de artifact reconhecidos. Espelha os MIME types do skill body. */
export type ArtifactType =
  | "application/vnd.ant.code"
  | "text/markdown"
  | "text/html"
  | "image/svg+xml"
  | "application/vnd.ant.mermaid"
  | "application/vnd.ant.react";

/** Artifact emitido pelo agente via tag <antArtifact>. */
export interface ArtifactPart {
  type: "artifact";
  /** Identificador estável (kebab-case). Mesmo id em turno seguinte = update. */
  identifier: string;
  /** MIME-like discriminator. */
  artifactType: ArtifactType;
  /** Label humano (1-6 palavras). */
  title: string;
  /** Linguagem (presente quando artifactType === application/vnd.ant.code). */
  language?: string;
  /** Payload bruto (TSX, markdown, HTML, SVG, mermaid src, etc). */
  source: string;
}

export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolInvocationPart
  | ImageAttachmentPart
  | FileAttachmentPart
  | StatusToastPart
  | CompactBoundaryPart
  | PromptSuggestionPart
  | AskUserQuestionPart
  | ArtifactPart
  | { type: string };

export type MessageRole = "user" | "assistant";

/** Metadata de custo/usage de um turno, extraida do SDKResultMessage. */
export interface TurnMetadata {
  costUsd?: number;
  durationMs?: number;
  numTurns?: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  model?: string;
  stopReason?: string;
  isError?: boolean;
  errors?: Array<{ message: string }>;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  parts: MessagePart[];
  /** Metadata do turno — presente na ultima mensagem assistant do turno. */
  turnMeta?: TurnMetadata;
  /** Flag de mensagem sintetica (replay de sessao resumida). */
  isSynthetic?: boolean;
}

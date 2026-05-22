// @codrstudio/openclaude-chat — barrel

// Tipos publicos
export type {
  Message,
  MessagePart,
  MessageRole,
  TextPart,
  ReasoningPart,
  ToolInvocationPart,
  ToolInvocationState,
  TurnMetadata,
} from "./types.js";

// Componente principal
export { Chat } from "./components/Chat.js";
export type { ChatProps, ChatMaxWidth } from "./components/Chat.js";

// Hook + Provider
export { useOpenClaudeChat } from "./hooks/useOpenClaudeChat.js";
export type {
  UseOpenClaudeChatOptions,
  UseOpenClaudeChatReturn,
} from "./hooks/useOpenClaudeChat.js";

export { ChatProvider, useChatContext } from "./hooks/ChatProvider.js";
export type { ChatProviderProps } from "./hooks/ChatProvider.js";

// Model select
export { ModelSelect } from "./components/ModelSelect.js";
export type { ModelSelectProps } from "./components/ModelSelect.js";
export { useModels } from "./hooks/useModels.js";
export type { ModelEntry, UseModelsReturn } from "./hooks/useModels.js";

// Subcomponentes
export { Markdown } from "./components/Markdown.js";
export { StreamingIndicator } from "./components/StreamingIndicator.js";
export { ErrorNote } from "./components/ErrorNote.js";
export type { ErrorNoteProps } from "./components/ErrorNote.js";
export { MessageBubble } from "./components/MessageBubble.js";
export type { MessageBubbleProps } from "./components/MessageBubble.js";
export { MessageList } from "./components/MessageList.js";
export type { MessageListProps } from "./components/MessageList.js";
export { MessageInput } from "./components/MessageInput.js";
export type { MessageInputProps, Attachment } from "./components/MessageInput.js";

// Parts
export { PartRenderer } from "./parts/PartRenderer.js";
export type { PartRendererProps } from "./parts/PartRenderer.js";
export { ReasoningBlock } from "./parts/ReasoningBlock.js";
export type { ReasoningBlockProps } from "./parts/ReasoningBlock.js";
export { ToolActivity, defaultToolIconMap } from "./parts/ToolActivity.js";
export type { ToolActivityProps, ToolActivityState } from "./parts/ToolActivity.js";
export { ToolResult } from "./parts/ToolResult.js";
export type { ToolResultProps } from "./parts/ToolResult.js";
export { TaskCard } from "./parts/TaskCard.js";
export type { TaskCardProps, TaskStatus } from "./parts/TaskCard.js";

// History
export { History } from "./components/History.js";
export type { HistoryProps } from "./components/History.js";

export { HistoryProvider, useHistoryContext } from "./hooks/HistoryProvider.js";
export type { HistoryProviderProps, HistoryContextValue } from "./hooks/HistoryProvider.js";

export type { Conversation, ConversationGroup } from "./components/history/types.js";
export { createLocalStorageTransport, writeMessages } from "./components/history/useHistoryData.js";

// SDK conversion
export { convertSDKMessages, extractTextFromParts } from "./lib/sdk-to-message.js";
export type { SDKMessage, SDKAssistantMessage, SDKUserMessage, SDKResultMessage } from "./lib/sdk-to-message.js";

// Transport
export { createDefaultTransport } from "./transport.js";
export type { ChatTransport, ConversationDetail, GetMessagesParams, GetMessagesResult } from "./transport.js";

// i18n
export { LocaleProvider, useTranslation, builtInLocales, supportedLocales, defaultLocale, resolveLocale } from "./i18n/index.js";
export type { LocaleProviderProps, LocaleSlug, BuiltInLocale, LocaleInfo, TranslationKeys, CustomMessages, CustomLocaleInfo } from "./i18n/index.js";

// Locale select
export { LocaleSelect } from "./components/LocaleSelect.js";
export type { LocaleSelectProps } from "./components/LocaleSelect.js";

// ChatHeader (compound, back-compat)
export { ChatHeader } from "./components/ChatHeader.js";
export type { ChatHeaderProps } from "./components/ChatHeader.js";

// ChatHeader subparts (for consumers that inject into their own breadcrumb/toolbar)
export { ChatTitle } from "./components/ChatTitle.js";
export type { ChatTitleProps, ChatTitleHandle } from "./components/ChatTitle.js";
export { ChatStarButton } from "./components/ChatStarButton.js";
export type { ChatStarButtonProps } from "./components/ChatStarButton.js";
export { ChatActionsMenu } from "./components/ChatActionsMenu.js";
export type { ChatActionsMenuProps } from "./components/ChatActionsMenu.js";

// History subparts (for consumers that assemble History from primitives)
export { HistoryNewButton } from "./components/history/HistoryNewButton.js";
export type { HistoryNewButtonProps } from "./components/history/HistoryNewButton.js";

// History containers (envelopes — wrap <History> with a layout moldura)
export { HistorySidebar } from "./components/HistorySidebar.js";
export type { HistorySidebarProps } from "./components/HistorySidebar.js";
export { HistoryDrawer } from "./components/HistoryDrawer.js";
export type { HistoryDrawerProps } from "./components/HistoryDrawer.js";
export { HistorySheet } from "./components/HistorySheet.js";
export type { HistorySheetProps } from "./components/HistorySheet.js";
export { HistoryResponsive } from "./components/HistoryResponsive.js";
export type { HistoryResponsiveProps } from "./components/HistoryResponsive.js";

// Chat actions responsive container (symmetric to HistoryResponsive)
export { ChatActionsResponsive } from "./components/ChatActionsResponsive.js";
export type { ChatActionsResponsiveProps } from "./components/ChatActionsResponsive.js";

// Generic media query hook (exposed for consumers writing their own responsive logic)
export { useMediaQuery } from "./hooks/useMediaQuery.js";

// HistoryTrigger (sidebar toggle button)
export { HistoryTrigger } from "./components/HistoryTrigger.js";
export type { HistoryTriggerProps } from "./components/HistoryTrigger.js";

// useIsMobile helper reuse
export { useIsMobile } from "./hooks/useIsMobile.js";

// Artifacts (rich output via <antArtifact> tag)
export { AppHost } from "./artifacts/AppHost.js";
export type { AppHostProps } from "./artifacts/AppHost.js";
export { compile, validate, CompileError } from "./artifacts/compile.js";
export type { CompileResult } from "./artifacts/compile.js";
export { buildScope } from "./artifacts/runtime.js";
export type { AppActions, BuildScopeOptions } from "./artifacts/runtime.js";
export type { ArtifactPart, ArtifactType } from "./types.js";
export { ArtifactCard } from "./parts/artifacts/ArtifactCard.js";

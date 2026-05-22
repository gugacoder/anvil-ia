export const enUS = {
  // MessageInput
  "input.placeholder": "Message box...",
  "input.send": "Send message",
  "input.stop": "Stop",
  "input.stopGeneration": "Stop generation",
  "input.record": "Record audio",
  "input.cancel": "Cancel",
  "input.add": "Add",
  "input.remove": "Remove",
  "input.dropHere": "Drop here",
  "input.uploading": "Uploading files...",
  "input.file": "File",
  "input.camera": "Camera",
  "input.gallery": "Gallery",
  "input.message": "Message",

  // MessageBubble
  "bubble.copy": "Copy message",
  "bubble.copied": "Copied",
  "bubble.emptyResponse": "(empty response)",

  // ErrorNote
  "error.default": "Failed to process message",
  "error.retry": "Try again",

  // StreamingIndicator
  "streaming.generating": "Generating response...",

  // ToolActivity
  "tool.running": "Running...",
  "tool.done": "Done",

  // PartRenderer
  "part.collapse": "Collapse",
  "part.expand": "Expand",
  "part.compactBoundary": "Conversation compacted",

  // Artifacts
  "artifact.error.title": "Couldn't render this artifact.",
  "artifact.error.transpile": "Compile error",
  "artifact.error.runtime": "Runtime error",
  "artifact.error.blocked": "Construct blocked",
  "artifact.action.copy": "Copy",
  "artifact.action.copied": "Copied!",
  "artifact.action.download": "Download",
  "artifact.action.openSource": "View source",
  "artifact.action.openPreview": "View preview",
  "artifact.action.openInNewTab": "Open in new tab",
  "artifact.loading": "Loading…",
  "artifact.unsupported": "Unsupported artifact type",

  // AskUserQuestion
  "askUser.title": "Waiting for your answer",
  "askUser.submit": "Submit",
  "askUser.submitting": "Sending…",
  "askUser.cancel": "Cancel",
  "askUser.cancelled": "Cancelled",
  "askUser.resolved": "Answered",
  "askUser.errorSubmit": "Failed to submit answer",
  "askUser.multiSelectHint": "Multiple choice",
  "askUser.progress": "{current} of {total}",

  // PartErrorBoundary
  "partError.default": "Failed to render block",

  // History
  "history.title": "History",
  "history.loading": "Loading...",
  "history.noResults": "No conversations found.",
  "history.empty": "No conversations yet.",
  "history.search": "Search conversations...",
  "history.today": "Today",
  "history.yesterday": "Yesterday",
  "history.thisWeek": "This week",
  "history.thisMonth": "This month",
  "history.older": "Older",

  // HistoryItem
  "history.rename": "Rename",
  "history.favorite": "Favorite",
  "history.unfavorite": "Unfavorite",
  "history.favorited": "Favorited",
  "history.delete": "Delete",
  "history.justNow": "just now",
  "history.message": "message",
  "history.messages": "messages",

  // HistoryDeleteDialog
  "history.deleteTitle": "Delete conversation?",
  "history.deleteDescription": "will be permanently deleted. This action cannot be undone.",
  "history.deleteCancel": "Cancel",
  "history.deleteConfirm": "Delete",

  // CodeBlockRenderer
  "code.copy": "Copy code",
  "code.copied": "Copied!",
  "code.copyLabel": "Copy",

  // CarouselRenderer
  "carousel.previous": "Previous",
  "carousel.next": "Next",
  "carousel.slides": "Slides",

  // ChoiceButtonsRenderer
  "choice.default": "Choose an option",

  // ImageViewerRenderer
  "image.zoomIn": "Zoom in",
  "image.zoomOut": "Zoom out",
  "image.resetZoom": "Reset zoom",
  "image.close": "Close",
  "image.viewer": "Image viewer",
  "image.enlarge": "Enlarge image",

  // GalleryRenderer
  "gallery.imageN": "Image",

  // MapViewRenderer
  "map.title": "OpenStreetMap Map",
  "map.locations": "Locations on map",

  // ComparisonTableRenderer
  "comparison.markBest": "Mark as best",

  // FileCardRenderer
  "file.download": "Download",

  // SpreadsheetRenderer
  "spreadsheet.row": "Row",

  // ProductCardRenderer
  "product.rating": "of 5 stars",
  "product.reviews": "reviews",
  "product.viewProduct": "View product",

  // ComparisonTableRenderer (extra)
  "comparison.attribute": "Attribute",
  "comparison.rating": "Rating",
  "comparison.description": "Description",

  // TurnFooter (MessageBubble)
  "bubble.tokenIn": "in",
  "bubble.tokenOut": "out",
  "bubble.tokenCached": "cached",

  // History (search results group)
  "history.results": "Results",
  "history.newConversation": "New conversation",

  // NoSessionState
  "chat.selectConversation": "Select a conversation",
  "chat.orCreateNew": "or create a new one from the sidebar",

  // DefaultWelcome (empty chat)
  "chat.welcomeTitle": "How can I help?",
  "chat.welcomeDescription": "Send a message to start the conversation. You can ask questions, trigger tools, or paste content for analysis.",

  // MessageList
  "chat.loadingOlder": "Loading older messages...",
  "chat.conversationStart": "Start of conversation",
} as const;

import type { TranslationKeys } from "../types.js";

export const esES: TranslationKeys = {
  // MessageInput
  "input.placeholder": "Escribe un mensaje...",
  "input.send": "Enviar mensaje",
  "input.stop": "Detener",
  "input.stopGeneration": "Detener generación",
  "input.record": "Grabar audio",
  "input.cancel": "Cancelar",
  "input.add": "Agregar",
  "input.remove": "Eliminar",
  "input.dropHere": "Suelta aquí",
  "input.uploading": "Subiendo archivos...",
  "input.file": "Archivo",
  "input.camera": "Cámara",
  "input.gallery": "Galería",
  "input.message": "Mensaje",

  // MessageBubble
  "bubble.copy": "Copiar mensaje",
  "bubble.copied": "Copiado",
  "bubble.emptyResponse": "(respuesta vacía)",

  // ErrorNote
  "error.default": "Error al procesar mensaje",
  "error.retry": "Reintentar",

  // StreamingIndicator
  "streaming.generating": "Generando respuesta...",

  // ToolActivity
  "tool.running": "Ejecutando...",
  "tool.done": "Completado",

  // PartRenderer
  "part.collapse": "Colapsar",
  "part.expand": "Expandir",
  "part.compactBoundary": "Conversación compactada",

  // Artifacts
  "artifact.error.title": "No se pudo renderizar este artefacto.",
  "artifact.error.transpile": "Error al compilar",
  "artifact.error.runtime": "Error en ejecución",
  "artifact.error.blocked": "Construcción bloqueada",
  "artifact.action.copy": "Copiar",
  "artifact.action.copied": "¡Copiado!",
  "artifact.action.download": "Descargar",
  "artifact.action.openSource": "Ver código",
  "artifact.action.openPreview": "Ver vista previa",
  "artifact.action.openInNewTab": "Abrir en pestaña nueva",
  "artifact.loading": "Cargando…",
  "artifact.unsupported": "Tipo de artefacto no soportado",

  // AskUserQuestion
  "askUser.title": "Esperando tu respuesta",
  "askUser.submit": "Responder",
  "askUser.submitting": "Enviando…",
  "askUser.cancel": "Cancelar",
  "askUser.cancelled": "Cancelado",
  "askUser.resolved": "Respondido",
  "askUser.errorSubmit": "Error al enviar respuesta",
  "askUser.multiSelectHint": "Múltiple elección",
  "askUser.progress": "{current} de {total}",

  // PartErrorBoundary
  "partError.default": "Error al renderizar bloque",

  // History
  "history.title": "Historial",
  "history.loading": "Cargando...",
  "history.noResults": "No se encontraron conversaciones.",
  "history.empty": "Aún no hay conversaciones.",
  "history.search": "Buscar conversaciones...",
  "history.today": "Hoy",
  "history.yesterday": "Ayer",
  "history.thisWeek": "Esta semana",
  "history.thisMonth": "Este mes",
  "history.older": "Más antiguas",

  // HistoryItem
  "history.rename": "Renombrar",
  "history.favorite": "Favorito",
  "history.unfavorite": "Quitar favorito",
  "history.favorited": "Favorito",
  "history.delete": "Eliminar",
  "history.justNow": "ahora",
  "history.message": "mensaje",
  "history.messages": "mensajes",

  // HistoryDeleteDialog
  "history.deleteTitle": "¿Eliminar conversación?",
  "history.deleteDescription": "se eliminará permanentemente. Esta acción no se puede deshacer.",
  "history.deleteCancel": "Cancelar",
  "history.deleteConfirm": "Eliminar",

  // CodeBlockRenderer
  "code.copy": "Copiar código",
  "code.copied": "¡Copiado!",
  "code.copyLabel": "Copiar",

  // CarouselRenderer
  "carousel.previous": "Anterior",
  "carousel.next": "Siguiente",
  "carousel.slides": "Diapositivas",

  // ChoiceButtonsRenderer
  "choice.default": "Elige una opción",

  // ImageViewerRenderer
  "image.zoomIn": "Acercar",
  "image.zoomOut": "Alejar",
  "image.resetZoom": "Restablecer zoom",
  "image.close": "Cerrar",
  "image.viewer": "Visor de imagen",
  "image.enlarge": "Ampliar imagen",

  // GalleryRenderer
  "gallery.imageN": "Imagen",

  // MapViewRenderer
  "map.title": "Mapa OpenStreetMap",
  "map.locations": "Ubicaciones en el mapa",

  // ComparisonTableRenderer
  "comparison.markBest": "Marcar como mejor",

  // FileCardRenderer
  "file.download": "Descargar",

  // SpreadsheetRenderer
  "spreadsheet.row": "Fila",

  // ProductCardRenderer
  "product.rating": "de 5 estrellas",
  "product.reviews": "reseñas",
  "product.viewProduct": "Ver producto",

  // ComparisonTableRenderer (extra)
  "comparison.attribute": "Atributo",
  "comparison.rating": "Valoración",
  "comparison.description": "Descripción",

  // TurnFooter (MessageBubble)
  "bubble.tokenIn": "entrada",
  "bubble.tokenOut": "salida",
  "bubble.tokenCached": "caché",

  // History (search results group)
  "history.results": "Resultados",
  "history.newConversation": "Nueva conversación",

  // NoSessionState
  "chat.selectConversation": "Selecciona una conversación",
  "chat.orCreateNew": "o crea una nueva desde la barra lateral",

  // DefaultWelcome (empty chat)
  "chat.welcomeTitle": "¿Cómo puedo ayudar?",
  "chat.welcomeDescription": "Envía un mensaje para iniciar la conversación. Puedes hacer preguntas, activar herramientas o pegar contenido para análisis.",

  // MessageList
  "chat.loadingOlder": "Cargando mensajes anteriores...",
  "chat.conversationStart": "Inicio de la conversación",
} as const;

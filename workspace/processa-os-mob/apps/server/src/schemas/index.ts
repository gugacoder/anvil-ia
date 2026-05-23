// =============================================================================
// Schemas centrais do server. Bodies de request, query params, payloads de
// resposta — toda fronteira tem schema declarado aqui. Espelha o que o shell
// consome (apps/shell/src/lib/schemas/index.ts) — quando divergir, ajusta-se
// nos dois lados ate convergir.
// =============================================================================

import { z } from "zod";

// -----------------------------------------------------------------------------
// /auth
// -----------------------------------------------------------------------------
export const LoginBodySchema = z.object({
  username: z.string().min(1, "Informe usuario"),
  password: z.string().min(1, "Informe senha"),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

// -----------------------------------------------------------------------------
// /notes
// -----------------------------------------------------------------------------
export const CreateNoteBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().optional(),
});
export type CreateNoteBody = z.infer<typeof CreateNoteBodySchema>;

export const PatchNoteBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().optional(),
});
export type PatchNoteBody = z.infer<typeof PatchNoteBodySchema>;

// -----------------------------------------------------------------------------
// /ai (conversations + messages)
// -----------------------------------------------------------------------------
export const CreateConversationBodySchema = z.object({
  agentId: z.string().optional(),
  noPool: z.boolean().optional(),
});
export type CreateConversationBody = z.infer<typeof CreateConversationBodySchema>;

export const PatchConversationBodySchema = z.object({
  title: z.string().optional(),
  starred: z.boolean().optional(),
});
export type PatchConversationBody = z.infer<typeof PatchConversationBodySchema>;

export const SendMessageBodySchema = z.object({
  message: z.string().min(1, "Mensagem vazia"),
});
export type SendMessageBody = z.infer<typeof SendMessageBodySchema>;

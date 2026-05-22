import React, { createContext, useContext, useMemo } from "react";
import { useOpenClaudeChat, type UseOpenClaudeChatOptions } from "./useOpenClaudeChat.js";
import { parseArtifacts } from "../artifacts/parser.js";
import type { TextPart, MessagePart } from "../types.js";

type ChatHookValue = ReturnType<typeof useOpenClaudeChat>;

interface ChatContextValue extends ChatHookValue {
  /**
   * Para cada `identifier` de artifact emitido na conversa, retorna o
   * "endereço" da última ocorrência: `${messageId}:${partIdx}:${tagIdx}`.
   * Renderers comparam contra o seu próprio endereço pra decidir se são
   * a versão "vencedora" (mostra) ou foram superseded (oculta).
   */
  artifactLatestAddress: Map<string, string>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps extends UseOpenClaudeChatOptions {
  children: React.ReactNode;
}

export function ChatProvider({ children, ...options }: ChatProviderProps) {
  const chat = useOpenClaudeChat(options);

  const artifactLatestAddress = useMemo(() => {
    const map = new Map<string, string>();
    for (const msg of chat.messages) {
      for (let pi = 0; pi < msg.parts.length; pi++) {
        const p = msg.parts[pi] as MessagePart;
        if (p.type !== "text") continue;
        const tp = p as TextPart;
        const segs = parseArtifacts(tp.text);
        let ti = 0;
        for (const s of segs) {
          if (s.kind === "artifact") {
            map.set(s.part.identifier, `${msg.id}:${pi}:${ti}`);
            ti++;
          }
        }
      }
    }
    return map;
  }, [chat.messages]);

  const value: ChatContextValue = useMemo(
    () => ({ ...chat, artifactLatestAddress }),
    [chat, artifactLatestAddress],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

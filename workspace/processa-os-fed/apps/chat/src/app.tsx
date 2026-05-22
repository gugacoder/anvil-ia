// =============================================================================
// Chat app standalone (Vite SPA) — vive em /so/chat/, conversa com Anvil.
// Federado no shell via Module Federation. Same-origin -> cookie
// httpOnly atravessa, /so/api/v1/* funciona normal.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  Chat,
  ChatHeader,
  HistoryProvider,
  HistoryResponsive,
  HistorySidebar,
  HistoryTrigger,
  LocaleProvider,
  createDefaultTransport,
  useHistoryContext,
} from "@/components/openclaude-chat";

const ENDPOINT = "/so/api/v1/ai";
const AGENT_ID = "anvil";

function Layout({ sessionId }: { sessionId: string | null }) {
  const { sidebarOpen, setSidebarOpen } = useHistoryContext();
  return (
    <div className="flex h-full min-h-0 gap-2 bg-background p-2">
      <aside className="hidden lg:flex">
        <HistorySidebar locale="pt-BR" className="rounded-xl bg-card shadow border-0" />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <ChatHeader leftContent={<HistoryTrigger />} title="Anvil" enableLocaleSelect={false} className="rounded-xl bg-card shadow border-0" />
        <div className="min-h-0 flex-1 rounded-xl bg-card shadow">
          <Chat
            endpoint={ENDPOINT}
            sessionId={sessionId ?? undefined}
            agentId={AGENT_ID}
            locale="pt-BR"
            sessionOptions={{ permissionMode: "bypassPermissions" }}
            enableLocaleSelect={false}
            enableModelSelect={false}
            enableAttachments
            enableVoice
            enableTurnMeta
            enableStreamingIndicator
            enableAskUserQuestion
            enableArtifacts
          />
        </div>
      </div>
      <HistoryResponsive open={sidebarOpen} onOpenChange={setSidebarOpen} locale="pt-BR" contentClassName="rounded-xl bg-card shadow border-0" />
    </div>
  );
}

export default function App() {
  const transport = useMemo(() => createDefaultTransport(ENDPOINT), []);
  const [sessionId, setSessionId] = useState<string | null>(() =>
    localStorage.getItem("fed.chat.session"),
  );

  useEffect(() => {
    if (sessionId) localStorage.setItem("fed.chat.session", sessionId);
    else localStorage.removeItem("fed.chat.session");
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) return;
    let cancelled = false;
    fetch(`${ENDPOINT}/conversations`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: AGENT_ID }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.sessionId) setSessionId(d.sessionId);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <LocaleProvider locale="pt-BR">
      <HistoryProvider
        transport={transport}
        agentId={AGENT_ID}
        activeConversationId={sessionId}
        onActiveChange={setSessionId}
        defaultSidebarOpen={false}
      >
        <Layout sessionId={sessionId} />
      </HistoryProvider>
    </LocaleProvider>
  );
}

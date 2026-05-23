// =============================================================================
// Chat app standalone (Vite SPA) — vive em /so/chat/, conversa com Anvil.
// Federado no shell via Module Federation. Same-origin -> cookie
// httpOnly atravessa, /so/api/v1/* funciona normal.
//
// Multi-instância: aceita AppInstanceProps quando montado pelo shell.
// Cada instância tem sua própria sessão (localStorage escopado por instanceId)
// e seu próprio MemoryRouter — não há colisão entre janelas abertas.
// Quando rodado standalone (sem shell), cai num default instanceId="solo".
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { MemoryRouter, Routes, Route, useNavigate, useLocation, useParams } from "react-router-dom";
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

/**
 * Props do contrato app↔shell. Quando o app é montado standalone
 * (sem shell), nenhuma prop chega — todos os campos viram defaults.
 */
interface AppInstanceProps {
  instanceId?: string;
  initialPath?: string;
  onPathChange?: (path: string) => void;
  onTitleChange?: (title: string) => void;
  formFactor?: "desktop" | "mobile";
}

export default function App(props: AppInstanceProps = {}) {
  const instanceId = props.instanceId ?? "solo";
  const initialPath = props.initialPath ?? "/";
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <RouteSync onPathChange={props.onPathChange} />
      <LocaleProvider locale="pt-BR">
        <Routes>
          <Route path="/" element={<ChatInstance instanceId={instanceId} sessionPath={null} />} />
          <Route
            path="/conversa/:sessionId"
            element={<ChatRouteWrapper instanceId={instanceId} />}
          />
        </Routes>
      </LocaleProvider>
    </MemoryRouter>
  );
}

/** Bridge: reporta path corrente ao shell sempre que muda. */
function RouteSync({ onPathChange }: { onPathChange?: (p: string) => void }) {
  const loc = useLocation();
  useEffect(() => {
    onPathChange?.(loc.pathname);
  }, [loc.pathname, onPathChange]);
  return null;
}

function ChatRouteWrapper({ instanceId }: { instanceId: string }) {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <ChatInstance instanceId={instanceId} sessionPath={sessionId ?? null} />;
}

function ChatInstance({
  instanceId,
  sessionPath,
}: {
  instanceId: string;
  sessionPath: string | null;
}) {
  const transport = useMemo(() => createDefaultTransport(ENDPOINT), []);
  const navigate = useNavigate();
  // chave de sessão escopada por instância — duas janelas não brigam pelo localStorage.
  const STORAGE_KEY = `fed.chat.session.${instanceId}`;

  const [sessionId, setSessionIdState] = useState<string | null>(
    () => sessionPath ?? localStorage.getItem(STORAGE_KEY),
  );

  // Sincroniza estado com a rota: se a URL mudar, adota.
  useEffect(() => {
    if (sessionPath && sessionPath !== sessionId) setSessionIdState(sessionPath);
  }, [sessionPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persiste a sessão por instância.
  useEffect(() => {
    if (sessionId) localStorage.setItem(STORAGE_KEY, sessionId);
    else localStorage.removeItem(STORAGE_KEY);
  }, [sessionId, STORAGE_KEY]);

  // Garante uma sessão ativa: cria uma se não houver, então navega pra rota canônica.
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
        if (d.sessionId) {
          setSessionIdState(d.sessionId);
          navigate(`/conversa/${d.sessionId}`, { replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  const setSessionId = (next: string | null) => {
    setSessionIdState(next);
    if (next) navigate(`/conversa/${next}`);
    else navigate("/");
  };

  return (
    <HistoryProvider
      transport={transport}
      agentId={AGENT_ID}
      activeConversationId={sessionId}
      onActiveChange={setSessionId}
      defaultSidebarOpen={false}
    >
      <Layout sessionId={sessionId} />
    </HistoryProvider>
  );
}

function Layout({ sessionId }: { sessionId: string | null }) {
  const { sidebarOpen, setSidebarOpen } = useHistoryContext();
  return (
    <div className="flex h-full min-h-0 gap-2 bg-background p-2">
      <aside className="hidden lg:flex">
        <HistorySidebar locale="pt-BR" className="rounded-xl bg-card shadow border-0" />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <ChatHeader
          leftContent={<HistoryTrigger />}
          title="Anvil"
          enableLocaleSelect={false}
          className="rounded-xl bg-card shadow border-0"
        />
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
      <HistoryResponsive
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        locale="pt-BR"
        contentClassName="rounded-xl bg-card shadow border-0"
      />
    </div>
  );
}

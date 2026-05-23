// =============================================================================
// Bridge HTTP+SSE entre <Chat> (openclaude-chat) e openclaude-sdk.
// Modelado em D:/nic/workspace/nic/jornada/apps/chat/src/index.ts.
// Agente unico: anvil — raiz do proprio repo (sobe 6 niveis a partir deste arquivo).
// =============================================================================

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createMultiSessionPool,
  createPersistentSession,
  type MultiSessionPool,
  type PersistentSession,
} from "@codrstudio/openclaude-sdk";
import { requireAuth } from "../lib/auth.js";
import { bus } from "./notifications.js";

const POOL_SIZE_PER_CWD = Number(process.env.POOL_SIZE_PER_CWD ?? 1);
const IDLE_TIMEOUT_MS = Number(process.env.IDLE_TIMEOUT_MS ?? 5 * 60_000);

// __dirname = <repo>/workspace/<slug>/apps/server/src/routes
// raiz do repo  = 6 niveis acima.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../../../..");

const AGENTS: Record<string, { cwd: string }> = {
  anvil: { cwd: process.env.ANVIL_CWD ?? REPO_ROOT },
};
const DEFAULT_AGENT = "anvil";

const resolveCwd = (agentId?: string) =>
  AGENTS[agentId ?? ""]?.cwd ?? AGENTS[DEFAULT_AGENT].cwd;

interface ConvState {
  id: string;
  session: PersistentSession | null;
  pendingNoPool?: boolean;
  agentId?: string;
  cwd: string;
  title: string;
  starred: boolean;
  messages: unknown[];
  createdAt: number;
  lastMessageAt: number;
  idleTimer?: NodeJS.Timeout;
}

const conversations = new Map<string, ConvState>();

const pool: MultiSessionPool = createMultiSessionPool({
  sizePerCwd: POOL_SIZE_PER_CWD,
  baseOptions: { permissionMode: "bypassPermissions" },
});
for (const a of Object.values(AGENTS)) pool.warm(a.cwd);

function bindIdleTimer(conv: ConvState) {
  if (conv.idleTimer) clearTimeout(conv.idleTimer);
  conv.idleTimer = setTimeout(
    () => void conv.session?.close().catch(() => undefined),
    IDLE_TIMEOUT_MS,
  );
  conv.idleTimer.unref?.();
}

export const aiRoutes = new Hono();
aiRoutes.use("*", requireAuth);

aiRoutes.post("/conversations", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    agentId?: string;
    noPool?: boolean;
  };
  const cwd = resolveCwd(body.agentId);
  let conv: ConvState;
  if (body.noPool) {
    const id = randomUUID();
    conv = {
      id,
      session: null,
      pendingNoPool: true,
      agentId: body.agentId ?? DEFAULT_AGENT,
      cwd,
      title: "Nova conversa",
      starred: false,
      messages: [],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    };
  } else {
    const session = pool.acquire({ cwd });
    conv = {
      id: session.sessionId,
      session,
      agentId: body.agentId ?? DEFAULT_AGENT,
      cwd,
      title: "Nova conversa",
      starred: false,
      messages: [],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    };
  }
  bindIdleTimer(conv);
  conversations.set(conv.id, conv);
  return c.json({ sessionId: conv.id });
});

aiRoutes.get("/conversations", (c) => {
  const filter = c.req.query("agentId");
  return c.json(
    Array.from(conversations.values())
      .filter((v) => !filter || v.agentId === filter)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      .map((v) => ({
        id: v.id,
        title: v.title,
        starred: v.starred,
        messageCount: v.messages.filter(
          (m) =>
            (m as { type?: string }).type === "user" ||
            (m as { type?: string }).type === "assistant",
        ).length,
        createdAt: new Date(v.createdAt).toISOString(),
        updatedAt: new Date(v.lastMessageAt).toISOString(),
      })),
  );
});

aiRoutes.get("/conversations/:id", (c) => {
  const v = conversations.get(c.req.param("id"));
  if (!v) return c.json({ error: "not_found" }, 404);
  return c.json({ id: v.id, title: v.title, starred: v.starred });
});

aiRoutes.patch("/conversations/:id", async (c) => {
  const v = conversations.get(c.req.param("id"));
  if (!v) return c.json({ error: "not_found" }, 404);
  const body = (await c.req.json().catch(() => ({}))) as {
    title?: string;
    starred?: boolean;
  };
  if (typeof body.title === "string") v.title = body.title;
  if (typeof body.starred === "boolean") v.starred = body.starred;
  return c.body(null, 204);
});

aiRoutes.delete("/conversations/:id", async (c) => {
  const v = conversations.get(c.req.param("id"));
  if (!v) return c.json({ error: "not_found" }, 404);
  if (v.idleTimer) clearTimeout(v.idleTimer);
  conversations.delete(v.id);
  await v.session?.close().catch(() => undefined);
  return c.body(null, 204);
});

aiRoutes.get("/conversations/:id/messages", (c) => {
  const v = conversations.get(c.req.param("id"));
  if (!v) return c.json({ error: "not_found" }, 404);
  return c.json({ messages: v.messages, hasMore: false, cursor: null });
});

aiRoutes.post("/conversations/:id/messages", async (c) => {
  let conv = conversations.get(c.req.param("id"));
  const id = c.req.param("id");

  if (conv && conv.pendingNoPool && !conv.session) {
    conv.session = createPersistentSession({
      sessionId: id,
      cwd: conv.cwd,
      permissionMode: "bypassPermissions",
    });
    conv.pendingNoPool = false;
  }

  if (conv && conv.session && conv.session.state === "dead") {
    conv.session = pool.acquireResume({ cwd: conv.cwd, sessionId: id });
  }

  if (!conv) {
    const cwd = resolveCwd();
    const session = pool.acquireResume({ cwd, sessionId: id });
    conv = {
      id,
      session,
      cwd,
      title: "Conversa retomada",
      starred: false,
      messages: [],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    };
    conversations.set(id, conv);
  }
  bindIdleTimer(conv);

  const body = (await c.req.json().catch(() => ({}))) as { message?: string };
  const text = (body.message ?? "").trim();
  if (!text) return c.json({ error: "empty_message" }, 400);

  conv.messages.push({
    type: "user",
    message: { role: "user", content: text },
    session_id: conv.id,
    timestamp: new Date().toISOString(),
  });
  if (conv.title === "Nova conversa" || conv.title === "Conversa retomada") {
    conv.title = text.slice(0, 60);
  }

  const session = conv.session!;
  const convRef = conv;

  return streamSSE(c, async (stream) => {
    const ping = setInterval(
      () => stream.writeSSE({ event: "ping", data: "" }).catch(() => undefined),
      15_000,
    );
    ping.unref?.();
    try {
      const turn = session.send(text);
      convRef.lastMessageAt = Date.now();
      for await (const msg of turn) {
        const t = (msg as { type?: string }).type;
        if (t === "user" || t === "assistant" || t === "system" || t === "result") {
          convRef.messages.push(msg);
        }
        await stream.writeSSE({ event: "message", data: JSON.stringify(msg) });
      }
      await stream.writeSSE({ event: "done", data: "" });
      bus.emit({
        kind: "chat",
        title: "Anvil respondeu",
        body: convRef.title.slice(0, 80),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await stream
        .writeSSE({ event: "error", data: JSON.stringify({ message }) })
        .catch(() => undefined);
    } finally {
      clearInterval(ping);
    }
  });
});

aiRoutes.get("/models", (c) =>
  c.json({
    defaultModel: "sonnet",
    models: [{ id: "sonnet", label: "Claude Sonnet" }],
  }),
);

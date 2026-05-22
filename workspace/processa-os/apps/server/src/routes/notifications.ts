// Notificacoes do SO via SSE — bus simples in-process.
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../lib/auth.js";

export interface Notif {
  id: string;
  kind: "system" | "chat" | "note" | "file" | "info";
  title: string;
  body: string;
  createdAt: string;
}

type Listener = (n: Notif) => void;

class Bus {
  private listeners = new Set<Listener>();
  private buffer: Notif[] = [];
  private MAX = 50;

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  recent(): Notif[] {
    return [...this.buffer];
  }

  emit(partial: Omit<Notif, "id" | "createdAt">): Notif {
    const n: Notif = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...partial,
    };
    this.buffer.push(n);
    if (this.buffer.length > this.MAX) this.buffer.shift();
    for (const l of this.listeners) {
      try {
        l(n);
      } catch {
        /* noop */
      }
    }
    return n;
  }
}

export const bus = new Bus();

export const notificationsRoutes = new Hono();
notificationsRoutes.use("*", requireAuth);

notificationsRoutes.get("/recent", (c) => c.json({ items: bus.recent() }));

notificationsRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<Notif>;
  const n = bus.emit({
    kind: (body.kind as Notif["kind"]) ?? "info",
    title: body.title ?? "Notificacao",
    body: body.body ?? "",
  });
  return c.json({ notification: n });
});

notificationsRoutes.get("/stream", (c) =>
  streamSSE(c, async (stream) => {
    // hello + replay
    await stream.writeSSE({ event: "hello", data: JSON.stringify({ ok: true }) });
    for (const n of bus.recent()) {
      await stream.writeSSE({ event: "notification", data: JSON.stringify(n) });
    }
    let alive = true;
    const unsub = bus.subscribe((n) => {
      if (!alive) return;
      stream
        .writeSSE({ event: "notification", data: JSON.stringify(n) })
        .catch(() => undefined);
    });
    const ping = setInterval(() => {
      if (!alive) return;
      stream.writeSSE({ event: "ping", data: "" }).catch(() => undefined);
    }, 20_000);
    ping.unref?.();

    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        alive = false;
        clearInterval(ping);
        unsub();
        resolve();
      });
    });
  }),
);

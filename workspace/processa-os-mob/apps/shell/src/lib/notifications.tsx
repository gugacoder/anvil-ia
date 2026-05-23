import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { NotifDto } from "./api";
import { NotifDtoSchema, safeParseWithWarn } from "./schemas";

interface Ctx {
  items: NotifDto[];
  unread: number;
  markAllRead: () => void;
  clear: () => void;
  latestToast: NotifDto | null;
}

const NotifCtx = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotifDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [latestToast, setLatestToast] = useState<NotifDto | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const startupRef = useRef(true);

  useEffect(() => {
    const es = new EventSource("/so/api/v1/notifications/stream", { withCredentials: true });
    sourceRef.current = es;
    es.addEventListener("hello", () => {
      startupRef.current = true;
    });
    es.addEventListener("notification", (ev: MessageEvent) => {
      let raw: unknown = null;
      try {
        raw = JSON.parse(ev.data);
      } catch {
        console.warn("[notif:sse] payload nao-JSON", { sample: String(ev.data).slice(0, 200) });
        return;
      }
      const n = safeParseWithWarn(NotifDtoSchema, raw, "notif.sse", null as NotifDto | null);
      if (!n) return;
      setItems((prev) => {
        if (prev.some((p) => p.id === n.id)) return prev;
        return [n, ...prev].slice(0, 100);
      });
      if (!startupRef.current) {
        setUnread((u) => u + 1);
        setLatestToast(n);
      }
    });
    // marca fim do replay apos primeiro frame
    const t = setTimeout(() => (startupRef.current = false), 300);
    return () => {
      clearTimeout(t);
      es.close();
    };
  }, []);

  return (
    <NotifCtx.Provider
      value={{
        items,
        unread,
        latestToast,
        markAllRead: () => setUnread(0),
        clear: () => {
          setItems([]);
          setUnread(0);
        },
      }}
    >
      {children}
    </NotifCtx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifCtx);
  if (!ctx) throw new Error("NotificationsProvider missing");
  return ctx;
}

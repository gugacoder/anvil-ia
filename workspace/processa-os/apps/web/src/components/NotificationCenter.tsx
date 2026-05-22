import { useEffect } from "react";
import { Bell, X, CircleDot } from "lucide-react";
import { useNotifications } from "../lib/notifications";
import type { NotifDto } from "../lib/api";

const KIND_LABEL: Record<NotifDto["kind"], string> = {
  system: "Sistema",
  chat: "Chat",
  note: "Notas",
  file: "Arquivos",
  info: "Aviso",
};

export function NotificationCenter({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { items, markAllRead, clear } = useNotifications();
  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead]);

  if (!open) return null;
  return (
    <div className="os-glass absolute top-12 right-2 z-[20] w-[360px] rounded-2xl p-2 shadow-2xl">
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4 text-primary" /> Notificações
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent"
            onClick={clear}
          >
            Limpar
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto px-1 pb-1">
        {items.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            Sem notificações.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((n) => (
              <li
                key={n.id}
                className="rounded-lg bg-card/60 p-2.5 text-sm hover:bg-card/80"
              >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <CircleDot className="h-2.5 w-2.5 text-primary" />
                  {KIND_LABEL[n.kind] ?? n.kind}
                  <span className="ml-auto tabular-nums">
                    {new Date(n.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="mt-1 font-medium">{n.title}</div>
                {n.body && (
                  <div className="text-xs text-muted-foreground">{n.body}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ToastStack() {
  const { latestToast } = useNotifications();
  // toast simples: aparece embaixo direito por 4s
  if (!latestToast) return null;
  return (
    <div
      key={latestToast.id}
      className="os-glass animate-in fade-in slide-in-from-right-2 absolute right-4 bottom-24 z-[6] w-[300px] rounded-xl p-3 text-sm shadow-xl"
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {KIND_LABEL[latestToast.kind] ?? latestToast.kind}
      </div>
      <div className="mt-0.5 font-medium">{latestToast.title}</div>
      {latestToast.body && (
        <div className="text-xs text-muted-foreground">{latestToast.body}</div>
      )}
    </div>
  );
}

// =============================================================================
// MobileShade — control center + notification shade unificados. Pull-down do
// topo abre. Tiles SO de coisas que controlamos de verdade: tema (light/dark),
// limpar notificacoes, sair. Tema de cor agora vive nas Configuracoes (Sistema).
// =============================================================================

import { motion } from "framer-motion";
import { Sun, Moon, RotateCcw, X, Bell, LogOut } from "lucide-react";
import { useMobState } from "../../lib/mob-state";
import { useNotifications } from "../../lib/notifications";
import { useTheme } from "../../lib/theme";
import { haptic } from "../../lib/haptics";
import type { User } from "../../lib/api";

interface ShadeProps {
  user: User;
  onLogout: () => void;
}

export function MobileShade({ user, onLogout }: ShadeProps) {
  const { closeShade } = useMobState();
  const { items, clear, markAllRead } = useNotifications();
  const { theme, toggle } = useTheme();

  return (
    <motion.div
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.2, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -120 || info.velocity.y < -500) closeShade();
      }}
      className="os-glass-strong absolute inset-x-0 top-0 z-50 max-h-[92dvh] overflow-hidden rounded-b-3xl shadow-2xl"
    >
      <div className="pt-safe">
        <div className="px-5 pt-3 pb-1 flex items-center justify-between">
          <span className="text-sm font-medium opacity-80">Olá, {user.name}</span>
          <button
            type="button"
            onClick={closeShade}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 pt-2">
          <Tile
            active={theme === "light"}
            label="Tema"
            Icon={theme === "dark" ? Sun : Moon}
            onClick={() => {
              haptic("light");
              toggle();
            }}
          />
          <Tile
            active={false}
            label="Limpar"
            Icon={RotateCcw}
            onClick={() => {
              haptic("medium");
              clear();
            }}
          />
          <Tile
            active={false}
            label="Sair"
            Icon={LogOut}
            tone="destructive"
            onClick={() => {
              haptic("warning");
              onLogout();
            }}
          />
        </div>

        <div className="px-4 pb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Notificações
          </span>
          {items.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              marcar lidas
            </button>
          )}
        </div>

        <div className="max-h-[40dvh] overflow-auto px-3 pb-4">
          {items.length === 0 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              Sem notificações.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.slice(0, 12).map((n) => (
                <li
                  key={n.id}
                  className="rounded-2xl bg-card/80 px-3 py-2 shadow-sm ring-1 ring-border/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {n.body}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-center pb-3" style={{ paddingBottom: "max(12px, var(--sa-bottom))" }}>
          <div className="h-1 w-12 rounded-full bg-foreground/30" />
        </div>
      </div>
    </motion.div>
  );
}

function Tile({
  active,
  label,
  Icon,
  onClick,
  tone = "default",
}: {
  active: boolean;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  tone?: "default" | "destructive";
}) {
  const activeClass =
    tone === "destructive"
      ? "bg-destructive text-destructive-foreground"
      : "bg-primary text-primary-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 transition-transform active:scale-95 ${
        active ? activeClass : "bg-card/70 text-foreground ring-1 ring-border/40"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

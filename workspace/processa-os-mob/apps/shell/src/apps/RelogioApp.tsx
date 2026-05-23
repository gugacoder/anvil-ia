import { useNow } from "../components/Clock";
import { AppContent } from "../components/AppContent";

const ZONES: { label: string; tz: string }[] = [
  { label: "São Paulo", tz: "America/Sao_Paulo" },
  { label: "Lisboa", tz: "Europe/Lisbon" },
  { label: "Nova York", tz: "America/New_York" },
  { label: "Tóquio", tz: "Asia/Tokyo" },
];

export function RelogioApp() {
  const now = useNow(1000);
  const big = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <AppContent width="widget" centerVertical>
      <div className="flex w-[480px] max-w-full flex-col gap-6 rounded-2xl border border-border bg-card/50 p-8 shadow-sm">
        <div className="text-center">
          <div className="font-mono text-6xl font-bold tabular-nums text-foreground">{big}</div>
          <div className="mt-1 text-sm capitalize text-muted-foreground">{date}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ZONES.map((z) => {
            const t = now.toLocaleTimeString("pt-BR", {
              timeZone: z.tz,
              hour: "2-digit",
              minute: "2-digit",
            });
            const d = now.toLocaleDateString("pt-BR", {
              timeZone: z.tz,
              day: "2-digit",
              month: "short",
            });
            return (
              <div key={z.tz} className="rounded-xl border border-border bg-card/60 p-3">
                <div className="text-xs text-muted-foreground">{z.label}</div>
                <div className="font-mono text-2xl font-semibold tabular-nums">{t}</div>
                <div className="text-[11px] text-muted-foreground">{d}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppContent>
  );
}

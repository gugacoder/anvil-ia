// DayView — vista de 1 dia com timeline horaria. Header grande com numero do
// dia + nome (hoje em primary). Linha "agora" e blocos sutis pra manha/tarde/noite.

import { useEffect, useState } from "react";
import { format as fmtRaw } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isToday, format, nowOffset } from "../lib/calendar";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtPt = (d: Date, p: string) => fmtRaw(d, p, { locale: ptBR });

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_H = 56;

export function DayView({ date }: { date: Date }) {
  const today = isToday(date);
  const [offset, setOffset] = useState(() => nowOffset());

  useEffect(() => {
    const t = setInterval(() => setOffset(nowOffset()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header do dia */}
      <div className="flex items-end gap-3 border-b border-border/50 bg-card/60 px-4 py-3 backdrop-blur sticky top-0 z-10 sm:px-6">
        <div
          className={`flex h-14 w-14 flex-col items-center justify-center rounded-2xl ${
            today
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
              : "bg-accent/40 text-foreground"
          }`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
            {fmtPt(date, "EEEEEE")}
          </span>
          <span className="text-xl font-bold tabular-nums leading-none">{format(date, "d")}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{cap(fmtPt(date, "EEEE"))}</span>
          <span className="text-xs text-muted-foreground">
            {cap(fmtPt(date, "MMMM 'de' yyyy"))}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative grid grid-cols-[56px_minmax(0,1fr)]"
          style={{ height: HOUR_H * 24 }}
        >
          {/* Coluna de horarios */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-muted-foreground"
                style={{ top: h * HOUR_H }}
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Corpo */}
          <div className={`relative border-l border-border/40 ${today ? "bg-primary/5" : ""}`}>
            {HOURS.map((h) => (
              <div
                key={h}
                className={`relative border-t border-border/30 ${
                  h >= 6 && h < 12
                    ? "bg-amber-500/5"
                    : h >= 12 && h < 18
                      ? "bg-orange-500/5"
                      : h >= 18 && h < 22
                        ? "bg-violet-500/5"
                        : ""
                }`}
                style={{ height: HOUR_H }}
              />
            ))}
            {today && (
              <div
                className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                style={{ top: offset * HOUR_H * 24 }}
              >
                <span className="h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-destructive shadow-md shadow-destructive/40" />
                <span className="h-px flex-1 bg-destructive" />
                <span className="rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-destructive-foreground">
                  {format(new Date(), "HH:mm")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

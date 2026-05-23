// WeekView — 7 colunas (dias) x 24 linhas horarias. Header sticky com nome
// do dia e numero (hoje destacado). Linha "agora" vermelha atravessa a vista.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  weekDates,
  isSameDay,
  isToday,
  isWeekend,
  format,
  nowOffset,
  toIsoParam,
} from "../lib/calendar";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_H = 48; // px por hora

export function WeekView({ date, selected }: { date: Date; selected: Date }) {
  const navigate = useNavigate();
  const days = weekDates(date);
  const [offset, setOffset] = useState(() => nowOffset());

  useEffect(() => {
    const t = setInterval(() => setOffset(nowOffset()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header dos dias */}
      <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] border-b border-border/50 bg-card/60 backdrop-blur sticky top-0 z-10">
        <div />
        {days.map((d) => {
          const sel = isSameDay(d, selected);
          const today = isToday(d);
          const we = isWeekend(d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => navigate(`/dia/${toIsoParam(d)}`)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 transition-colors hover:bg-accent/40"
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-widest ${
                  we ? "text-primary/70" : "text-muted-foreground"
                }`}
              >
                {format(d, "EEEEEE")}
              </span>
              <span
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm tabular-nums ${
                  today
                    ? "bg-primary text-primary-foreground font-bold"
                    : sel
                      ? "ring-1 ring-primary/60 font-semibold"
                      : "font-medium"
                }`}
              >
                {format(d, "d")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Corpo: horarios x dias */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative grid grid-cols-[40px_repeat(7,minmax(0,1fr))]"
          style={{ height: HOUR_H * 24 }}
        >
          {/* Coluna de horarios */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[10px] font-medium tabular-nums text-muted-foreground"
                style={{ top: h * HOUR_H }}
              >
                {h.toString().padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {days.map((d) => {
            const today = isToday(d);
            return (
              <div
                key={d.toISOString()}
                className={`relative border-l border-border/40 ${
                  today ? "bg-primary/5" : ""
                }`}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="border-t border-border/30"
                    style={{ height: HOUR_H }}
                  />
                ))}
                {/* Linha "agora" so na coluna do dia atual */}
                {today && (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                    style={{ top: offset * HOUR_H * 24 }}
                  >
                    <span className="h-2 w-2 -translate-x-1/2 rounded-full bg-destructive shadow-md shadow-destructive/40" />
                    <span className="h-px flex-1 bg-destructive" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

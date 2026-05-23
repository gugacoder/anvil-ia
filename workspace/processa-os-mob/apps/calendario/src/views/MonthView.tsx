// MonthView — grid 6x7 elegante. Cabeçario de dias da semana sticky,
// dias do mes corrente em destaque, dias adjacentes desbotados, hoje em
// pill primary, fim-de-semana sutil.

import { useNavigate } from "react-router-dom";
import {
  monthGrid,
  weekdayLabels,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  format,
  toIsoParam,
} from "../lib/calendar";

export function MonthView({ date, selected }: { date: Date; selected: Date }) {
  const navigate = useNavigate();
  const days = monthGrid(date);
  const labels = weekdayLabels();

  return (
    <div className="flex h-full flex-col px-3 pb-3 sm:px-6 sm:pb-6">
      {/* Cabeçalho de dias da semana */}
      <div className="grid grid-cols-7 border-b border-border/50 pb-2">
        {labels.map((l, i) => (
          <div
            key={l}
            className={`text-center text-[10px] font-semibold uppercase tracking-widest ${
              i === 0 || i === 6 ? "text-primary/70" : "text-muted-foreground"
            }`}
          >
            {l}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px bg-border/30 mt-px rounded-lg overflow-hidden">
        {days.map((d) => {
          const inMonth = isSameMonth(d, date);
          const today = isToday(d);
          const isSelected = isSameDay(d, selected);
          const weekend = isWeekend(d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => navigate(`/dia/${toIsoParam(d)}`)}
              className={`group relative flex flex-col items-stretch justify-start gap-1 p-1.5 text-left transition-colors ${
                inMonth ? "bg-card" : "bg-card/40"
              } ${weekend && inMonth ? "bg-accent/20" : ""} hover:bg-accent/40 active:bg-accent/60`}
            >
              <div className="flex items-start justify-end">
                <span
                  className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs tabular-nums transition-all ${
                    today
                      ? "bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/30"
                      : isSelected
                        ? "ring-1 ring-primary/60 text-foreground font-semibold"
                        : inMonth
                          ? weekend
                            ? "text-primary/80 font-medium"
                            : "text-foreground font-medium"
                          : "text-muted-foreground/50"
                  }`}
                >
                  {format(d, "d")}
                </span>
              </div>
              {/* Slot pra eventos futuros (vazio por enquanto) */}
              <div className="min-h-0 flex-1" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

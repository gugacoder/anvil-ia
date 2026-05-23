// YearView — 12 mini-calendarios. Tap em um mes -> MonthView.

import { useNavigate } from "react-router-dom";
import { format as fmtRaw } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  yearMonths,
  monthGrid,
  weekdayLabels,
  isSameDay,
  isSameMonth,
  isToday,
  format,
  toIsoParam,
} from "../lib/calendar";

const monthName = (d: Date) => {
  const s = fmtRaw(d, "MMMM", { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function YearView({ date, selected }: { date: Date; selected: Date }) {
  const navigate = useNavigate();
  const months = yearMonths(date);
  return (
    <div className="grid h-full auto-rows-min grid-cols-2 gap-3 overflow-auto p-3 sm:grid-cols-3 sm:gap-5 sm:p-6 lg:grid-cols-4">
      {months.map((m) => (
        <MiniMonth key={m.toISOString()} month={m} selected={selected} onOpen={() => navigate(`/mes/${toIsoParam(m)}`)} />
      ))}
    </div>
  );
}

function MiniMonth({
  month,
  selected,
  onOpen,
}: {
  month: Date;
  selected: Date;
  onOpen: () => void;
}) {
  const days = monthGrid(month);
  const labels = weekdayLabels();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/70 p-3 text-left backdrop-blur transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{monthName(month)}</span>
      </div>
      <div className="grid grid-cols-7 gap-px">
        {labels.map((l) => (
          <div key={l} className="text-center text-[8px] uppercase text-muted-foreground/60">
            {l[0]}
          </div>
        ))}
        {days.map((d) => {
          const inMonth = isSameMonth(d, month);
          const today = isToday(d);
          const sel = isSameDay(d, selected);
          return (
            <div
              key={d.toISOString()}
              className={`flex h-5 items-center justify-center text-[9px] tabular-nums ${
                today
                  ? "rounded-full bg-primary text-primary-foreground font-bold"
                  : sel && inMonth
                    ? "rounded-full ring-1 ring-primary/60"
                    : inMonth
                      ? "text-foreground/80"
                      : "text-muted-foreground/30"
              }`}
            >
              {format(d, "d")}
            </div>
          );
        })}
      </div>
    </button>
  );
}

// Helpers de calendario baseados em date-fns + locale pt-BR.
// Tudo aqui e funcao pura. Nada de estado, nada de DOM.

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  startOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfYear,
  addMonths,
  addWeeks,
  addDays,
  addYears,
  format,
  isSameDay,
  isSameMonth,
  isWeekend,
  isToday,
  getHours,
  getMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { View } from "./schemas";

export const WEEK_STARTS_ON = 0 as const; // domingo (padrao pt-BR)

/** Grid 6x7 = 42 datas pra renderizar um mes (com dias adjacentes pra completar semanas). */
export function monthGrid(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON, locale: ptBR });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON, locale: ptBR });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  // Garante 42 (algumas configuracoes geram 35 ou 49 em meses estranhos)
  while (days.length < 42) days.push(addDays(days[days.length - 1], 1));
  return days.slice(0, 42);
}

/** 7 datas de uma semana (dom..sab). */
export function weekDates(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON, locale: ptBR });
  return eachDayOfInterval({ start, end: endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON, locale: ptBR }) });
}

/** 12 primeiros-dias-de-mes do ano. */
export function yearMonths(date: Date): Date[] {
  return eachMonthOfInterval({ start: startOfYear(date), end: endOfYear(date) });
}

/** ["dom","seg","ter","qua","qui","sex","sab"]. */
export function weekdayLabels(): string[] {
  // Usa qualquer data pra extrair os 7 labels via format
  const base = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON, locale: ptBR });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(base, i), "EEEEEE", { locale: ptBR }).toLowerCase(),
  );
}

/** Titulo amigavel por view: "Maio 2026" / "19–25 mai 2026" / "Sexta, 23 mai" / "2026" / "Agenda". */
export function formatTitle(view: View, date: Date): string {
  switch (view) {
    case "mes":
      return capitalize(format(date, "MMMM yyyy", { locale: ptBR }));
    case "semana": {
      const w = weekDates(date);
      const first = w[0];
      const last = w[6];
      if (isSameMonth(first, last)) {
        return `${format(first, "d")}–${format(last, "d 'de' MMM yyyy", { locale: ptBR })}`;
      }
      return `${format(first, "d 'de' MMM", { locale: ptBR })} – ${format(last, "d 'de' MMM yyyy", { locale: ptBR })}`;
    }
    case "dia":
      return capitalize(format(date, "EEEE, d 'de' MMMM", { locale: ptBR }));
    case "ano":
      return format(date, "yyyy");
    case "agenda":
      return "Agenda";
  }
}

/** Step de navegacao prev/next conforme view. */
export function stepDate(view: View, date: Date, dir: 1 | -1): Date {
  switch (view) {
    case "mes":
      return addMonths(date, dir);
    case "semana":
      return addWeeks(date, dir);
    case "dia":
      return addDays(date, dir);
    case "ano":
      return addYears(date, dir);
    case "agenda":
      return date; // navegacao nao se aplica em agenda
  }
}

/** Formata data pra param de URL (YYYY-MM-DD). */
export function toIsoParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Offset percentual (0..1) da hora atual no dia — pra linha "agora" em Week/Day view. */
export function nowOffset(now: Date = new Date()): number {
  return (getHours(now) * 60 + getMinutes(now)) / (24 * 60);
}

/** Re-exports usados nas views — evita imports diretos do date-fns espalhados. */
export { isSameDay, isSameMonth, isWeekend, isToday, format, startOfDay };

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

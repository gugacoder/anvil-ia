import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function ClockLabel() {
  const now = useNow(15_000);
  const fmtDay = now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  const fmtHour = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <span className="font-medium tabular-nums">
      {fmtDay} · {fmtHour}
    </span>
  );
}

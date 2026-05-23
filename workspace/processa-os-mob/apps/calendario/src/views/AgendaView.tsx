// AgendaView — placeholder bonito enquanto nao ha persistencia de eventos.

import { CalendarOff, Sparkles } from "lucide-react";

export function AgendaView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="relative">
        <div className="absolute -inset-6 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl border border-border/60 bg-card/70 backdrop-blur">
          <CalendarOff className="h-9 w-9 text-primary/80" strokeWidth={1.5} />
        </div>
      </div>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">Sem eventos por aqui ainda</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Quando a persistência de eventos for habilitada, sua agenda dos próximos dias aparece aqui.
        </p>
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/50 px-3 py-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        em breve
      </div>
    </div>
  );
}

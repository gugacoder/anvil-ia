// =============================================================================
// Calendario standalone (Vite SPA) — federado no shell em /so/calendario/.
//
// 5 visoes (mes/semana/dia/ano/agenda), navegacao prev/next com slide,
// swipe horizontal em mobile, bottom-nav OS-like. Sem persistencia de eventos
// nesta versao — Agenda mostra placeholder.
//
// Bordas validadas com zod: props vindas do shell, params de URL,
// localStorage de preferencias.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  Clock as ClockIcon,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  CircleDot,
} from "lucide-react";
import {
  AppInstancePropsSchema,
  type AppInstanceProps,
  type View,
  resolveDateParam,
} from "./lib/schemas";
import { formatTitle, stepDate, toIsoParam } from "./lib/calendar";
import { useAppStorage } from "./pos-storage";
import { useIsNarrow } from "./lib/use-is-narrow";
import { MonthView } from "./views/MonthView";
import { WeekView } from "./views/WeekView";
import { DayView } from "./views/DayView";
import { YearView } from "./views/YearView";
import { AgendaView } from "./views/AgendaView";

// -----------------------------------------------------------------------------
// Top-level App — valida props, monta MemoryRouter, define rotas.
// -----------------------------------------------------------------------------
export default function App(rawProps: unknown = {}) {
  const parsed = AppInstancePropsSchema.safeParse(rawProps);
  const props: AppInstanceProps = parsed.success ? parsed.data : {};
  const scope = props.instanceId ?? "solo";

  // Último path conhecido (view + data). Sobrevive a reload em qualquer
  // layout — não depende do shell rehidratar initialPath.
  const [lastPath, setLastPath] = useAppStorage<string>(scope, "last-path", "/mes");
  const initialPath = props.initialPath && props.initialPath !== "/" ? props.initialPath : lastPath;

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <RouteSync
        onPathChange={(p) => {
          setLastPath(p);
          if (typeof props.onPathChange === "function") props.onPathChange(p);
        }}
      />
      <Routes>
        <Route path="/" element={<Navigate to={initialPath} replace />} />
        <Route path="/mes" element={<CalendarShell scope={scope} view="mes" />} />
        <Route path="/mes/:date" element={<CalendarShell scope={scope} view="mes" />} />
        <Route path="/semana" element={<CalendarShell scope={scope} view="semana" />} />
        <Route path="/semana/:date" element={<CalendarShell scope={scope} view="semana" />} />
        <Route path="/dia" element={<CalendarShell scope={scope} view="dia" />} />
        <Route path="/dia/:date" element={<CalendarShell scope={scope} view="dia" />} />
        <Route path="/ano" element={<CalendarShell scope={scope} view="ano" />} />
        <Route path="/ano/:date" element={<CalendarShell scope={scope} view="ano" />} />
        <Route path="/agenda" element={<CalendarShell scope={scope} view="agenda" />} />
        <Route path="*" element={<Navigate to={initialPath} replace />} />
      </Routes>
    </MemoryRouter>
  );
}

function RouteSync({ onPathChange }: { onPathChange?: (p: string) => void }) {
  const loc = useLocation();
  useEffect(() => {
    onPathChange?.(loc.pathname);
  }, [loc.pathname, onPathChange]);
  return null;
}

// -----------------------------------------------------------------------------
// Shell do calendario — header, view-switcher, animacao, gesto, bottom-nav.
// -----------------------------------------------------------------------------
function CalendarShell({ scope: _scope, view }: { scope: string; view: View }) {
  const navigate = useNavigate();
  const params = useParams<{ date?: string }>();
  const narrow = useIsNarrow();

  const date = useMemo(() => resolveDateParam(params.date), [params.date]);
  const today = useMemo(() => new Date(), []);

  // Direcao da animacao (1 = next, -1 = prev) — controlada por nav
  const [direction, setDirection] = useState<1 | -1>(1);

  function navTo(nextView: View, nextDate: Date, dir: 1 | -1 = 1) {
    setDirection(dir);
    if (nextView === "agenda") {
      navigate(`/agenda`);
      return;
    }
    navigate(`/${nextView}/${toIsoParam(nextDate)}`);
  }

  function goPrev() {
    navTo(view, stepDate(view, date, -1), -1);
  }
  function goNext() {
    navTo(view, stepDate(view, date, 1), 1);
  }
  function goToday() {
    navTo(view, today, 1);
  }

  // Keyboard nav (desktop)
  useEffect(() => {
    if (view === "agenda") return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "t" || e.key === "T") goToday();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, date]);

  // Drag horizontal mobile -> prev/next
  function onDragEnd(_e: unknown, info: PanInfo) {
    if (view === "agenda") return;
    const threshold = 60;
    const v = info.velocity.x;
    const dx = info.offset.x;
    if (dx > threshold || v > 500) goPrev();
    else if (dx < -threshold || v < -500) goNext();
  }

  const motionKey = `${view}-${toIsoParam(date)}`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <Header
        view={view}
        date={date}
        narrow={narrow}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onSwitchView={(v) => navTo(v, date, 1)}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={motionKey}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 24 }}
            transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.7 }}
            drag={narrow && view !== "agenda" ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            className="absolute inset-0 touch-pan-y"
          >
            {renderView(view, date)}
          </motion.div>
        </AnimatePresence>
      </div>

      {narrow && <BottomNav view={view} onSwitchView={(v) => navTo(v, date, 1)} />}
    </div>
  );
}

function renderView(view: View, date: Date) {
  switch (view) {
    case "mes":
      return <MonthView date={date} selected={date} />;
    case "semana":
      return <WeekView date={date} selected={date} />;
    case "dia":
      return <DayView date={date} />;
    case "ano":
      return <YearView date={date} selected={date} />;
    case "agenda":
      return <AgendaView />;
  }
}

// -----------------------------------------------------------------------------
// Header (compartilhado desktop/mobile)
// -----------------------------------------------------------------------------
function Header({
  view,
  date,
  narrow,
  onPrev,
  onNext,
  onToday,
  onSwitchView,
}: {
  view: View;
  date: Date;
  narrow: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSwitchView: (v: View) => void;
}) {
  const title = formatTitle(view, date);
  const showNav = view !== "agenda";

  return (
    <header className="border-b border-border/50 bg-card/70 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          {showNav && (
            <>
              <IconButton onClick={onPrev} title="Anterior">
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <IconButton onClick={onNext} title="Próximo">
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </>
          )}
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
            {title}
          </h1>
        </div>
        {showNav && (
          <button
            type="button"
            onClick={onToday}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-accent active:scale-95"
          >
            <CircleDot className="h-3 w-3 text-primary" />
            Hoje
          </button>
        )}
      </div>
      {!narrow && <DesktopTabs view={view} onSwitchView={onSwitchView} />}
    </header>
  );
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Tabs desktop e bottom-nav mobile (mesmas labels, layouts distintos)
// -----------------------------------------------------------------------------

const VIEW_ITEMS: Array<{ id: View; label: string; Icon: typeof CalendarIcon }> = [
  { id: "mes", label: "Mês", Icon: CalendarIcon },
  { id: "semana", label: "Semana", Icon: CalendarRange },
  { id: "dia", label: "Dia", Icon: ClockIcon },
  { id: "ano", label: "Ano", Icon: CalendarDays },
  { id: "agenda", label: "Agenda", Icon: ListTodo },
];

function DesktopTabs({ view, onSwitchView }: { view: View; onSwitchView: (v: View) => void }) {
  return (
    <div className="flex items-center gap-1 border-t border-border/50 px-3 py-1.5 sm:px-6">
      {VIEW_ITEMS.map((it) => {
        const active = it.id === view;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSwitchView(it.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <it.Icon className="h-3.5 w-3.5" />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function BottomNav({ view, onSwitchView }: { view: View; onSwitchView: (v: View) => void }) {
  return (
    <nav
      className="grid grid-cols-5 border-t border-border/50 bg-card/80 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {VIEW_ITEMS.map((it) => {
        const active = it.id === view;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSwitchView(it.id)}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              active ? "text-primary" : "text-muted-foreground active:text-foreground"
            }`}
          >
            <it.Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} />
            <span>{it.label}</span>
            {active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

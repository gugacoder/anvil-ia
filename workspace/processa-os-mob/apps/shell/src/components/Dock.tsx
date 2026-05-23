// =============================================================================
// Dock — barra inferior do desktop. Renderiza:
//   - pinados (drag-to-reorder, overflow horizontal scroll)
//   - janelas órfãs (running mas não pinadas, não-arrastáveis)
//   - separador
//   - botão Lens (Grip) — abre DesktopAppLens
//
// DnD:
//   - PointerSensor com activationConstraint.distance=6 (click curto não dispara)
//   - TouchSensor com delay=200ms tolerance=5 (toque longo p/ arrastar)
//   - KeyboardSensor com sortableKeyboardCoordinates (setas + Space)
//   - DragOverlay em portal no body (não vaza pelo overflow-x do dock)
//   - autoScroll habilitado pra rolar quando arrasta perto da borda
//   - prefers-reduced-motion desliga springs do rearranjo
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Grip } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AppDef } from "../apps/registry";
import { useWindows, isNegotiated, type WinState } from "../lib/windows";
import { useWindowedAppStatus } from "../lib/use-app-status";
import { AppStatusIndicator } from "./AppStatusIndicator";
import type { AppStatus } from "../lib/use-app-status";

interface Props {
  apps: AppDef[];
  pinned: string[];
  onLaunch: (a: AppDef) => void;
  onReorder: (pinned: string[]) => void;
  onOpenLens: () => void;
  lensOpen: boolean;
}

interface MenuState {
  appId: string;
  anchor: { x: number; y: number };
}

export function Dock({ apps, pinned, onLaunch, onReorder, onOpenLens, lensOpen }: Props) {
  const { windows, focus, activeId, openNew, closeAll, close } = useWindows();
  const { status: appStatus } = useWindowedAppStatus();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [hovered, setHovered] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const byId = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);
  const pinnedApps = useMemo(
    () => pinned.map((slug) => byId.get(slug)).filter((a): a is AppDef => !!a),
    [pinned, byId],
  );

  // Janela maximizada em foco recolhe o dock em filete; hover restaura.
  const negotiated = windows.find((w) => isNegotiated(w, activeId)) ?? null;
  const collapsed = !!negotiated && !hovered && !menu && !lensOpen && !draggingId;

  // grupo de janelas por appId, mais recente primeiro
  const groupOf = (appId: string) =>
    windows.filter((w) => w.appId === appId).sort((a, b) => b.z - a.z);

  // Órfãs: janelas de apps que não estão pinados — aparecem ao lado como tab.
  const pinnedIds = useMemo(() => new Set(pinned), [pinned]);
  const orphanGroups = useMemo(() => {
    const m = new Map<string, WinState[]>();
    for (const w of windows) {
      if (pinnedIds.has(w.appId)) continue;
      const list = m.get(w.appId) ?? [];
      list.push(w);
      m.set(w.appId, list);
    }
    return m;
  }, [windows, pinnedIds]);

  useEffect(() => {
    if (!menu) return;
    function onClick() {
      setMenu(null);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [menu]);

  function handleClick(app: AppDef) {
    const group = groupOf(app.id);
    if (group.length === 0) {
      onLaunch(app);
      return;
    }
    focus(group[0].id);
  }

  function handleContext(e: React.MouseEvent, app: AppDef) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ appId: app.id, anchor: { x: e.clientX, y: e.clientY } });
  }

  // DnD sensors — distance=6 evita drag em click curto; touch tem delay
  // explícito; teclado usa setas + Space pra reorder acessível.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pinned.indexOf(String(active.id));
    const newIndex = pinned.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(pinned, oldIndex, newIndex));
  }

  function handleDragCancel() {
    setDraggingId(null);
  }

  // Para o filete: mesma ordem visual do dock (pinados + órfãs).
  const dockItems = [
    ...pinned.map((slug) => ({ id: slug, focused: appStatus.get(slug) === "foreground" })),
    ...Array.from(orphanGroups.keys()).map((appId) => ({
      id: appId,
      focused: appStatus.get(appId) === "foreground",
    })),
  ];

  const draggingApp = draggingId ? byId.get(draggingId) : null;

  return (
    <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-[9999] flex justify-center">
      <div
        className="pointer-events-auto max-w-[min(96vw,1100px)]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <AnimatePresence initial={false} mode="wait">
          {collapsed ? (
            <motion.div
              key="filete"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.1, ease: "easeOut" }}
              className="cursor-pointer px-10 py-4 min-w-[60vw]"
              title="Mostrar dock"
            >
              <div className="flex items-center justify-center gap-1.5">
                {dockItems.map((item) => (
                  <span
                    key={item.id}
                    className={`block h-2 rounded-full transition-all ${
                      item.focused ? "w-8 bg-primary" : "w-4 bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dock"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.1, ease: "easeOut" }}
              className="os-glass mb-3 flex items-end gap-1 rounded-2xl p-2"
            >
              {/* Área scrollável: pinados (sortable) + órfãs */}
              <DockScrollRow>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                  accessibility={{
                    announcements: {
                      onDragStart: ({ active }) => `Pegou ${labelOf(byId, active.id)}.`,
                      onDragOver: ({ active, over }) =>
                        over
                          ? `${labelOf(byId, active.id)} sobre posição de ${labelOf(byId, over.id)}.`
                          : `${labelOf(byId, active.id)} fora de qualquer posição.`,
                      onDragEnd: ({ active, over }) =>
                        over
                          ? `${labelOf(byId, active.id)} solto na posição de ${labelOf(byId, over.id)}.`
                          : `${labelOf(byId, active.id)} solto fora — sem mudança.`,
                      onDragCancel: ({ active }) =>
                        `Reordenação de ${labelOf(byId, active.id)} cancelada.`,
                    },
                  }}
                >
                  <SortableContext items={pinned} strategy={horizontalListSortingStrategy}>
                    <div className="flex items-end gap-1">
                      {pinnedApps.map((app) => {
                        const status = appStatus.get(app.id);
                        const focused = status === "foreground";
                        return (
                          <SortableDockIcon
                            key={app.id}
                            app={app}
                            focused={focused}
                            indicator={status}
                            isDragging={draggingId === app.id}
                            onClick={() => handleClick(app)}
                            onContextMenu={(e) => handleContext(e, app)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                  {typeof document !== "undefined" &&
                    createPortal(
                      <DragOverlay dropAnimation={null}>
                        {draggingApp ? <DockIconOverlay app={draggingApp} /> : null}
                      </DragOverlay>,
                      document.body,
                    )}
                </DndContext>

                {/* Órfãs (running mas não pinadas) — não arrastáveis */}
                {Array.from(orphanGroups.entries()).map(([appId, group]) => {
                  const first = group[0];
                  const focused = appStatus.get(appId) === "foreground";
                  return (
                    <button
                      key={appId}
                      type="button"
                      onClick={() => focus(group.sort((a, b) => b.z - a.z)[0].id)}
                      onContextMenu={(e) => handleContext(e, first.app)}
                      className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xs ${
                        focused ? "bg-primary/20 text-primary" : "hover:bg-white/10"
                      }`}
                      title={first.title}
                    >
                      {first.app.Icon ? <first.app.Icon className="h-5 w-5" /> : null}
                      <AppStatusIndicator status={appStatus.get(appId)} />
                    </button>
                  );
                })}
              </DockScrollRow>

              {/* Separador + Lens — fixo na direita, fora do scroll.
                  pb-3 espelha o do scroll row pra alinhar baseline dos ícones. */}
              <div className="flex items-end gap-1 pb-3">
                <span aria-hidden className="mx-1 h-10 w-px shrink-0 self-center bg-foreground/15" />
                <button
                  type="button"
                  onClick={onOpenLens}
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition ${
                    lensOpen ? "bg-primary/20 text-primary" : "hover:bg-white/10"
                  }`}
                  title="Buscar apps (Ctrl+Shift+Espaço)"
                  aria-label="Abrir lens de apps"
                  aria-pressed={lensOpen}
                >
                  <Grip className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {menu && (
        <DockMenu
          key={menu.appId}
          appId={menu.appId}
          anchor={menu.anchor}
          windows={groupOf(menu.appId)}
          app={
            byId.get(menu.appId) ??
            windows.find((w) => w.appId === menu.appId)?.app ??
            null
          }
          onClose={() => setMenu(null)}
          onNew={(app) => {
            setMenu(null);
            openNew(app);
          }}
          onFocus={(id) => {
            setMenu(null);
            focus(id);
          }}
          onClose1={(id) => {
            setMenu(null);
            close(id);
          }}
          onCloseAll={(appId) => {
            setMenu(null);
            closeAll(appId);
          }}
        />
      )}
    </div>
  );
}

function labelOf(byId: Map<string, AppDef>, id: string | number) {
  return byId.get(String(id))?.label ?? String(id);
}

/**
 * Wrapper com overflow-x: auto e scrollbar oculta. Mantém scroll wheel/touch
 * funcional sem afetar a estética. Fade nas bordas indica continuidade.
 */
function DockScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Permite rolar com wheel mesmo quando o user não tem trackpad horizontal.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!el) return;
      // Se já tem componente horizontal, deixa nativo. Senão, traduz vertical → horizontal.
      if (e.deltaX !== 0) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={ref}
      className="dock-scroll flex items-end gap-1 overflow-x-auto pb-3"
      style={{ scrollbarWidth: "none" }}
    >
      {children}
    </div>
  );
}

function SortableDockIcon({
  app,
  focused,
  indicator,
  isDragging,
  onClick,
  onContextMenu,
}: {
  app: AppDef;
  focused: boolean;
  indicator: AppStatus | undefined;
  isDragging: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id: app.id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging || sortableDragging ? 0.35 : 1,
  };
  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group relative grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-colors touch-none ${
        focused ? "bg-primary/20 text-primary" : "text-foreground hover:bg-white/10"
      }`}
      title={app.label}
      {...attributes}
      {...listeners}
    >
      <app.Icon className="h-5 w-5" />
      <AppStatusIndicator status={indicator} />
    </button>
  );
}

function DockIconOverlay({ app }: { app: AppDef }) {
  return (
    <span className="os-glass grid h-12 w-12 place-items-center rounded-xl text-primary shadow-2xl ring-1 ring-primary/40">
      <app.Icon className="h-5 w-5" />
    </span>
  );
}

interface DockMenuProps {
  appId: string;
  anchor: { x: number; y: number };
  windows: WinState[];
  app: AppDef | null;
  onClose: () => void;
  onNew: (app: AppDef) => void;
  onFocus: (winId: string) => void;
  onClose1: (winId: string) => void;
  onCloseAll: (appId: string) => void;
}

function DockMenu({
  appId,
  anchor,
  windows,
  app,
  onNew,
  onFocus,
  onClose1,
  onCloseAll,
}: DockMenuProps) {
  if (!app) return null;
  const isMulti = !!app.multi;
  const width = 240;
  const x = Math.max(8, Math.min(anchor.x - width / 2, window.innerWidth - width - 8));
  const y = Math.max(8, anchor.y - 8);
  return (
    <div
      role="menu"
      className="os-glass pointer-events-auto fixed z-[10000] w-60 -translate-y-full rounded-xl p-1 text-sm shadow-2xl"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isMulti && (
        <>
          <button
            type="button"
            onClick={() => onNew(app)}
            className="flex w-full items-center rounded-lg px-3 py-1.5 text-left hover:bg-accent"
          >
            Nova janela
          </button>
          <div className="my-1 h-px bg-border" />
        </>
      )}
      {windows.length > 0 ? (
        <>
          <div className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Janelas abertas
          </div>
          {windows.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-1 rounded-lg pl-1 hover:bg-accent"
            >
              <button
                type="button"
                onClick={() => onFocus(w.id)}
                className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span className="truncate">{w.title}</span>
              </button>
              <button
                type="button"
                onClick={() => onClose1(w.id)}
                title="Fechar esta janela"
                className="rounded-md p-1 text-muted-foreground hover:bg-rose-500/15 hover:text-rose-500"
              >
                <CloseX />
              </button>
            </div>
          ))}
          {windows.length >= 2 && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => onCloseAll(appId)}
                className="flex w-full items-center rounded-lg px-3 py-1.5 text-left text-rose-500 hover:bg-accent"
              >
                Fechar todas
              </button>
            </>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => onNew(app)}
          className="flex w-full items-center rounded-lg px-3 py-1.5 text-left hover:bg-accent"
        >
          Abrir
        </button>
      )}
    </div>
  );
}

function CloseX() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}

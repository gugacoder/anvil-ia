// =============================================================================
// MobileBackGesture — edge-swipe Android-style. Touch nas bordas esquerda/direita
// dispara animacao de "peek" do destino (predictive back). Solte alem do threshold
// pra confirmar (volta pra home). Solte antes, animacao reverte.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobState } from "../../lib/mob-state";
import { haptic } from "../../lib/haptics";

const EDGE_W = 20; // px de zona ativa nas bordas
const COMMIT = 110; // px de drag pra commitar

export function MobileBackGesture() {
  const { foregroundId, goHome } = useMobState();
  const [drag, setDrag] = useState<{ side: "L" | "R"; dx: number } | null>(null);
  const start = useRef<{ x: number; y: number; side: "L" | "R" } | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!foregroundId) return;

    function onDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.buttons === 0) return;
      const x = e.clientX;
      const w = window.innerWidth;
      if (x <= EDGE_W) {
        start.current = { x, y: e.clientY, side: "L" };
        triggered.current = true;
      } else if (x >= w - EDGE_W) {
        start.current = { x, y: e.clientY, side: "R" };
        triggered.current = true;
      }
    }
    function onMove(e: PointerEvent) {
      if (!triggered.current || !start.current) return;
      const dx = start.current.side === "L" ? e.clientX - start.current.x : start.current.x - e.clientX;
      setDrag({ side: start.current.side, dx: Math.max(0, dx) });
    }
    function onUp() {
      if (!triggered.current) return;
      const committed = drag && drag.dx >= COMMIT;
      triggered.current = false;
      start.current = null;
      if (committed) {
        haptic("medium");
        goHome();
      }
      setDrag(null);
    }
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [foregroundId, drag, goHome]);

  if (!foregroundId) return null;
  const progress = drag ? Math.min(1, drag.dx / COMMIT) : 0;

  return (
    <AnimatePresence>
      {drag && (
        <motion.div
          key="back-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-40"
        >
          {/* Indicador visual da borda (chevron) */}
          <div
            className="absolute top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white shadow-2xl backdrop-blur-md"
            style={{
              left: drag.side === "L" ? Math.min(drag.dx * 0.6, 60) - 28 : undefined,
              right: drag.side === "R" ? Math.min(drag.dx * 0.6, 60) - 28 : undefined,
              opacity: 0.5 + progress * 0.5,
              transform: `translateY(-50%) scale(${0.7 + progress * 0.4})`,
            }}
          >
            <Chevron side={drag.side} />
          </div>
          {/* Predictive peek: app encolhe e revela home por baixo (a animacao real
              ocorre via opacity dim no app). Forma sutil pra nao competir com switcher. */}
          <div
            className="absolute inset-0 bg-black"
            style={{
              opacity: progress * 0.35,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Chevron({ side }: { side: "L" | "R" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d={side === "L" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

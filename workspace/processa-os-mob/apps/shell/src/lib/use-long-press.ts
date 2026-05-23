// Long-press hook (pointer-events). Aciona apos `ms` segurando sem mover muito.

import { useEffect, useRef, useCallback } from "react";

export function useLongPress(onLongPress: () => void, ms = 500, moveTolerance = 8) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return {
    onPointerDown(e: React.PointerEvent) {
      start.current = { x: e.clientX, y: e.clientY };
      cancel();
      timer.current = window.setTimeout(() => {
        onLongPress();
        timer.current = null;
      }, ms);
    },
    onPointerMove(e: React.PointerEvent) {
      if (!start.current || timer.current === null) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (dx * dx + dy * dy > moveTolerance * moveTolerance) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
  };
}

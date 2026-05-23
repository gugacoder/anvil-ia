// =============================================================================
// MobileSwitcher — app switcher iOS-style. Cards 3D em fila, swipe horizontal
// entre eles, swipe vertical pra cima fecha. Tap entra. Tap fora volta pra home.
// =============================================================================

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useMobState } from "../../lib/mob-state";
import { haptic } from "../../lib/haptics";

export function MobileSwitcher() {
  const { open, foregroundId, bringToFront, closeApp, closeSwitcher, goHome } = useMobState();
  const initialIdx = Math.max(
    0,
    open.findIndex((o) => o.appId === foregroundId),
  );
  const [idx, setIdx] = useState(initialIdx);

  useEffect(() => {
    if (open.length === 0) {
      closeSwitcher();
      goHome();
    }
  }, [open.length, closeSwitcher, goHome]);

  const CARD_W = Math.min(window.innerWidth * 0.7, 360);
  const GAP = 16;
  const STRIDE = CARD_W + GAP;

  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(28px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40"
      onClick={(e) => {
        if ((e.target as HTMLElement).dataset.switcherBg === "1") {
          closeSwitcher();
          goHome();
        }
      }}
      data-switcher-bg="1"
    >
      <div className="mb-4 text-xs uppercase tracking-widest text-white/80" data-switcher-bg="1">
        {open.length === 0 ? "Sem apps abertos" : `${open.length} apps`}
      </div>

      <motion.div
        className="relative flex items-center"
        style={{ width: CARD_W, height: window.innerHeight * 0.6 }}
        data-switcher-bg="1"
      >
        <motion.div
          className="flex items-center"
          animate={{ x: -idx * STRIDE }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          drag="x"
          dragConstraints={{ left: -(open.length - 1) * STRIDE, right: 0 }}
          dragElastic={0.12}
          onDragEnd={(_, info) => {
            const threshold = STRIDE / 3;
            if (info.offset.x < -threshold && idx < open.length - 1) setIdx(idx + 1);
            else if (info.offset.x > threshold && idx > 0) setIdx(idx - 1);
          }}
          style={{ gap: GAP }}
        >
          {open.map((o, i) => (
            <SwitcherCard
              key={o.appId}
              focused={i === idx}
              width={CARD_W}
              label={o.app.label}
              Icon={o.app.Icon}
              onTap={() => {
                if (i === idx) {
                  haptic("light");
                  bringToFront(o.appId);
                } else {
                  setIdx(i);
                }
              }}
              onSwipeUp={() => {
                haptic("medium");
                closeApp(o.appId);
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      <div className="mt-6 flex items-center gap-2" data-switcher-bg="1">
        <button
          type="button"
          onClick={() => {
            goHome();
          }}
          className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/20"
        >
          Home
        </button>
      </div>
    </motion.div>
  );
}

function SwitcherCard({
  focused,
  width,
  label,
  Icon,
  onTap,
  onSwipeUp,
}: {
  focused: boolean;
  width: number;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onTap: () => void;
  onSwipeUp: () => void;
}) {
  return (
    <motion.div
      animate={{ scale: focused ? 1 : 0.92, opacity: focused ? 1 : 0.7 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      drag="y"
      dragConstraints={{ top: -260, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.y < -120 || info.velocity.y < -500) onSwipeUp();
      }}
      onClick={onTap}
      className="os-glass-strong relative flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-3xl shadow-2xl shadow-black/50 ring-1 ring-white/10"
      style={{ width, height: window.innerHeight * 0.6 }}
    >
      <div className="absolute inset-x-0 top-0 flex h-10 items-center justify-between px-3 bg-card/60 backdrop-blur">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSwipeUp();
          }}
          className="rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Fechar app"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Icon className="h-16 w-16 opacity-40" />
      </div>
    </motion.div>
  );
}

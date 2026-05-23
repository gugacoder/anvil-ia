// =============================================================================
// MobileShell — shell completo do modo celular. Z-order:
//   home (10) < app-runtime (30) < switcher (40) < drawer (50) < dock (55) <
//   back-overlay (60) < shade (70). Dock fica sempre on top do app.
// =============================================================================

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApps } from "../../lib/use-apps";
import { useMobState, MobStateProvider } from "../../lib/mob-state";
import { api, type User } from "../../lib/api";
import { MobileHome } from "./MobileHome";
import { MobileAppRuntime } from "./MobileAppRuntime";
import { MobileSwitcher } from "./MobileSwitcher";
import { MobileShade } from "./MobileShade";
import { MobileBackGesture } from "./MobileBackGesture";
import { MobileDock } from "./MobileDock";
import { MobileAppDrawer } from "./MobileAppDrawer";

interface MobileShellProps {
  user: User;
  onLogout: () => void;
}

export function MobileShell({ user, onLogout }: MobileShellProps) {
  return (
    <MobStateProvider>
      <MobileShellInner user={user} onLogout={onLogout} />
    </MobStateProvider>
  );
}

function MobileShellInner({ user, onLogout }: MobileShellProps) {
  const { apps, loading, error } = useApps();
  const { foregroundId, switcherOpen, shadeOpen, drawerOpen, hydrate } = useMobState();

  useEffect(() => {
    if (apps.length) hydrate(apps);
  }, [apps, hydrate]);

  async function logout() {
    await api.logout();
    onLogout();
  }

  return (
    <div className="mob-shell os-wallpaper relative h-safe-screen w-full overflow-hidden select-none-touch">
      {loading && (
        <div className="pt-safe absolute top-2 left-4 z-10 text-xs text-white/70 drop-shadow">
          Carregando registry…
        </div>
      )}
      {error && (
        <div className="pt-safe absolute top-2 left-4 z-10 text-xs text-rose-300 drop-shadow">
          Falha no registry: {error}
        </div>
      )}

      <MobileHome />

      <AnimatePresence>
        {foregroundId && !switcherOpen && (
          <motion.div
            key={`fg-${foregroundId}`}
            initial={{ scale: 0.85, opacity: 0, borderRadius: 48 }}
            animate={{ scale: 1, opacity: 1, borderRadius: 0 }}
            exit={{ scale: 0.85, opacity: 0, borderRadius: 48 }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.9 }}
            className="absolute inset-0 z-30 overflow-hidden bg-background"
            style={{ paddingBottom: "calc(var(--sa-bottom) + var(--dock-h, 76px))" }}
          >
            <MobileAppRuntime />
          </motion.div>
        )}
      </AnimatePresence>

      <MobileBackGesture />

      <AnimatePresence>{switcherOpen && <MobileSwitcher key="switcher" />}</AnimatePresence>

      {/* Drawer e overlay sempre montados; visibilidade via animate (evita
          quirks de AnimatePresence com unmount + StrictMode em dev). */}
      <DrawerOverlay open={drawerOpen} />
      <MobileAppDrawer open={drawerOpen} apps={apps} />

      <MobileDock apps={apps} />

      <AnimatePresence>
        {shadeOpen && <MobileShade key="shade" user={user} onLogout={logout} />}
      </AnimatePresence>

      <ShadePullZone />
    </div>
  );
}

function DrawerOverlay({ open }: { open: boolean }) {
  const { closeDrawer } = useMobState();
  return (
    <div
      onClick={closeDrawer}
      className="fixed inset-0 z-[49] bg-black/30 backdrop-blur-sm"
      style={{
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 180ms ease-out",
      }}
    />
  );
}

function ShadePullZone() {
  const { openShade, shadeOpen } = useMobState();
  if (shadeOpen) return null;
  return (
    <motion.div
      className="touch-none absolute left-0 right-0 z-40"
      style={{ top: "var(--sa-top)", height: 18 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 80 }}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        if (info.offset.y > 40 || info.velocity.y > 300) openShade();
      }}
    />
  );
}

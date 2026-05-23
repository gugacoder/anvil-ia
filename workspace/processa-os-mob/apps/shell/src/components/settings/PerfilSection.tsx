import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { api } from "../../lib/api";

export function PerfilSection() {
  const [me, setMe] = useState<{ sub: string; name: string; avatar: string } | null>(null);

  useEffect(() => {
    api.me().then(setMe);
  }, []);

  async function logout() {
    await api.logout();
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Perfil</h2>
        <p className="text-xs text-muted-foreground">Sua conta e sessão.</p>
      </header>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        {me ? (
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
              {me.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{me.name}</div>
              <div className="truncate text-xs text-muted-foreground">@{me.sub}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        )}
      </div>
    </section>
  );
}

import { Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "../lib/theme";
import { api } from "../lib/api";
import { useEffect, useState } from "react";

export function SistemaApp() {
  const { theme, setTheme } = useTheme();
  const [me, setMe] = useState<{ sub: string; name: string; avatar: string } | null>(null);

  useEffect(() => {
    api.me().then(setMe);
  }, []);

  async function logout() {
    await api.logout();
    window.location.reload();
  }

  return (
    <div className="flex h-full flex-col bg-background p-6">
      <h2 className="mb-4 text-lg font-semibold">Configurações do sistema</h2>

      <section className="mb-6 rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Perfil
        </div>
        {me ? (
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold">
              {me.avatar}
            </div>
            <div>
              <div className="font-medium">{me.name}</div>
              <div className="text-xs text-muted-foreground">@{me.sub}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="ml-auto flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Aparência
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              theme === "dark"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            <Moon className="h-4 w-4" /> Escuro
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              theme === "light"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            <Sun className="h-4 w-4" /> Claro
          </button>
        </div>
      </section>
    </div>
  );
}

import { useState } from "react";
import { api } from "../lib/api";
import type { User } from "../lib/api";
import { Power, Moon, LogIn, User as UserIcon } from "lucide-react";
import { useTheme } from "../lib/theme";

export function LockScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { toggle } = useTheme();

  async function submit(e: React.FormEvent | null, guest = false) {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const u = await api.login(
        guest ? "convidado" : username || "anvil",
        guest ? "guest" : password || "anvil",
      );
      onLogin(u);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="os-wallpaper flex h-full w-full items-center justify-center">
      <form
        onSubmit={(e) => submit(e)}
        className="os-glass w-[360px] rounded-2xl p-8 shadow-2xl"
      >
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40">
            <UserIcon className="h-9 w-9" />
          </div>
          <div className="text-lg font-semibold tracking-tight">Processa OS</div>
        </div>

        <label className="mb-2 block text-xs text-muted-foreground" htmlFor="user">
          Usuário
        </label>
        <input
          id="user"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-3 w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
          placeholder="seu.usuario"
        />

        <label className="mb-2 block text-xs text-muted-foreground" htmlFor="pwd">
          Senha
        </label>
        <input
          id="pwd"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
          placeholder="••••••••"
        />

        {err && <div className="mb-3 text-xs text-rose-400">{err}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => submit(null, true)}
          className="mt-2 block w-full text-center text-xs text-primary hover:underline"
        >
          Entrar como convidado
        </button>

        <div className="my-5 h-px bg-border" />

        <div className="flex justify-center gap-6 text-muted-foreground">
          <button
            type="button"
            title="Desligar (recarrega)"
            onClick={() => window.location.reload()}
            className="rounded-full p-1 hover:text-foreground"
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Tema"
            onClick={toggle}
            className="rounded-full p-1 hover:text-foreground"
          >
            <Moon className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Foco no login"
            onClick={() => document.getElementById("user")?.focus()}
            className="rounded-full p-1 hover:text-foreground"
          >
            <LogIn className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

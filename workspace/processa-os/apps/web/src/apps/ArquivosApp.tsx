import { useEffect, useState } from "react";
import { ChevronUp, Folder, FileText, Home } from "lucide-react";
import { api, type FileItem } from "../lib/api";

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function ArquivosApp() {
  const [cwd, setCwd] = useState("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ path: string; text: string } | null>(null);

  async function load(p: string) {
    setErr(null);
    setPreview(null);
    try {
      const r = await api.files.list(p);
      setCwd(r.path);
      setItems(r.items);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  function up() {
    if (!cwd) return;
    const parts = cwd.split("/").filter(Boolean);
    parts.pop();
    void load(parts.join("/"));
  }

  function pick(f: FileItem) {
    const next = cwd ? `${cwd}/${f.name}` : f.name;
    if (f.dir) {
      void load(next);
    } else {
      api.files
        .content(next)
        .then((r) => setPreview(r))
        .catch((e) => setErr((e as Error).message));
    }
  }

  return (
    <div className="flex h-full bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5 text-xs">
          <button
            type="button"
            onClick={() => void load("")}
            className="rounded p-1 hover:bg-accent"
            title="Raiz"
          >
            <Home className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={up}
            disabled={!cwd}
            className="rounded p-1 hover:bg-accent disabled:opacity-40"
            title="Subir"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span className="ml-2 truncate font-mono text-muted-foreground">
            /storage/files/{cwd}
          </span>
        </div>
        {err && <div className="px-3 py-2 text-xs text-rose-400">{err}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">
              Pasta vazia. Adicione arquivos em <code className="ml-1">storage/files/</code>.
            </div>
          ) : (
            <ul>
              {items.map((it) => (
                <li key={it.name}>
                  <button
                    type="button"
                    onClick={() => pick(it)}
                    className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {it.dir ? (
                      <Folder className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{it.name}</span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {it.dir ? "" : fmtSize(it.size)}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {new Date(it.modifiedAt).toLocaleDateString("pt-BR")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {preview && (
        <aside className="flex w-1/2 shrink-0 flex-col border-l border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
            <span className="truncate font-mono">{preview.path}</span>
            <button
              type="button"
              className="rounded px-2 py-1 hover:bg-accent"
              onClick={() => setPreview(null)}
            >
              Fechar
            </button>
          </div>
          <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs whitespace-pre-wrap">
            {preview.text}
          </pre>
        </aside>
      )}
    </div>
  );
}

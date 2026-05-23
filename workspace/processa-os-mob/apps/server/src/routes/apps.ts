// =============================================================================
// Registry de apps do Processa OS fed.
// Shell le /so/api/v1/apps no boot e monta icones/dock a partir daqui.
// kind=internal -> app vive dentro do bundle do shell (montado inline)
// kind=federated -> app eh Vite SPA propria, renderizada via Module Federation (sem iframe)
// =============================================================================

import { Hono } from "hono";

export interface AppManifest {
  slug: string;
  label: string;
  icon: string; // lucide icon name
  kind: "internal" | "external" | "federated";
  /** Pra external/federated: path publico relativo a `/so/`. Ex: "chat" -> "/so/chat/". */
  basePath?: string;
  /** Pra external/federated em dev: porta do Vite SPA. Usado pelo proxy do shell. */
  devPort?: number;
  defaultSize: { w: number; h: number };
  order: number;
  /**
   * Suporta múltiplas instâncias simultâneas (Nova janela / Duplicar).
   * Honrado no desktop; ignorado no mobile (sempre singleton).
   */
  multi?: boolean;
  /** Rota inicial passada ao remote quando o shell abre uma janela "do zero". */
  defaultPath?: string;
}

export const REGISTRY: AppManifest[] = [
  {
    slug: "chat",
    label: "Anvil Chat",
    icon: "MessageCircle",
    kind: "federated",
    basePath: "chat",
    devPort: 5632,
    defaultSize: { w: 920, h: 620 },
    order: 1,
    multi: true,
    defaultPath: "/",
  },
  {
    slug: "notas",
    label: "Notas",
    icon: "StickyNote",
    kind: "federated",
    basePath: "notas",
    devPort: 5633,
    defaultSize: { w: 780, h: 540 },
    order: 2,
    multi: true,
    defaultPath: "/",
  },
  {
    slug: "calendario",
    label: "Calendário",
    icon: "Calendar",
    kind: "federated",
    basePath: "calendario",
    devPort: 5644,
    defaultSize: { w: 900, h: 700 },
    order: 3,
    multi: true,
    defaultPath: "/",
  },
  {
    slug: "arquivos",
    label: "Arquivos",
    icon: "FolderOpen",
    kind: "internal",
    defaultSize: { w: 720, h: 500 },
    order: 4,
  },
  {
    slug: "relogio",
    label: "Relógio",
    icon: "Clock",
    kind: "internal",
    defaultSize: { w: 540, h: 380 },
    order: 5,
  },
  {
    slug: "sistema",
    label: "Sistema",
    icon: "Settings",
    kind: "internal",
    defaultSize: { w: 560, h: 440 },
    order: 6,
  },
  {
    slug: "contador",
    label: "Contador",
    icon: "Hash",
    kind: "internal",
    defaultSize: { w: 520, h: 520 },
    order: 7,
  },
];

export const appsRoutes = new Hono();

appsRoutes.get("/", (c) =>
  c.json({
    apps: [...REGISTRY].sort((a, b) => a.order - b.order),
  }),
);

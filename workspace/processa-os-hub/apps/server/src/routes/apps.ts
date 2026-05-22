// =============================================================================
// Registry de apps do Processa OS hub.
// Shell le /so/api/v1/apps no boot e monta icones/dock a partir daqui.
// kind=internal -> app vive dentro do bundle do shell (montado inline)
// kind=external -> app eh Vite SPA propria, renderizada via <iframe>
// =============================================================================

import { Hono } from "hono";

export interface AppManifest {
  slug: string;
  label: string;
  icon: string; // lucide icon name
  kind: "internal" | "external";
  /** Pra external: path publico relativo a `/so/`. Ex: "chat" -> "/so/chat/". */
  basePath?: string;
  /** Pra external em dev: porta do Vite SPA. Usado pelo proxy do shell. */
  devPort?: number;
  defaultSize: { w: number; h: number };
  order: number;
}

export const REGISTRY: AppManifest[] = [
  {
    slug: "chat",
    label: "Anvil Chat",
    icon: "MessageCircle",
    kind: "external",
    basePath: "chat",
    devPort: 5622,
    defaultSize: { w: 920, h: 620 },
    order: 1,
  },
  {
    slug: "notas",
    label: "Notas",
    icon: "StickyNote",
    kind: "external",
    basePath: "notas",
    devPort: 5623,
    defaultSize: { w: 780, h: 540 },
    order: 2,
  },
  {
    slug: "arquivos",
    label: "Arquivos",
    icon: "FolderOpen",
    kind: "internal",
    defaultSize: { w: 720, h: 500 },
    order: 3,
  },
  {
    slug: "relogio",
    label: "Relógio",
    icon: "Clock",
    kind: "internal",
    defaultSize: { w: 540, h: 380 },
    order: 4,
  },
  {
    slug: "sistema",
    label: "Sistema",
    icon: "Settings",
    kind: "internal",
    defaultSize: { w: 560, h: 440 },
    order: 5,
  },
];

export const appsRoutes = new Hono();

appsRoutes.get("/", (c) =>
  c.json({
    apps: [...REGISTRY].sort((a, b) => a.order - b.order),
  }),
);

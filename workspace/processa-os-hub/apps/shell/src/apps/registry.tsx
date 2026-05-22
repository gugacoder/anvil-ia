// =============================================================================
// Registry-driven dos apps. Shell le manifestos do server via /so/api/v1/apps
// e mapeia pra um AppDef renderizavel.
//   - kind=external -> renderiza <IframeApp src="/so/<basePath>/" />
//   - kind=internal -> renderiza componente vendido com o shell
// =============================================================================

import {
  MessageCircle,
  StickyNote,
  FolderOpen,
  Settings,
  Clock as ClockIcon,
  AppWindow,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { ArquivosApp } from "./ArquivosApp";
import { SistemaApp } from "./SistemaApp";
import { RelogioApp } from "./RelogioApp";
import { IframeApp } from "./IframeApp";

export interface AppManifest {
  slug: string;
  label: string;
  icon: string;
  kind: "internal" | "external";
  basePath?: string;
  devPort?: number;
  defaultSize: { w: number; h: number };
  order: number;
}

export interface AppDef {
  id: string;
  label: string;
  Icon: LucideIcon;
  render: () => ReactNode;
  defaultSize?: { w: number; h: number };
  kind: "internal" | "external";
}

const ICONS: Record<string, LucideIcon> = {
  MessageCircle,
  StickyNote,
  FolderOpen,
  Settings,
  Clock: ClockIcon,
};

const INTERNAL_RENDERERS: Record<string, () => ReactNode> = {
  arquivos: () => <ArquivosApp />,
  relogio: () => <RelogioApp />,
  sistema: () => <SistemaApp />,
};

const PUBLIC_PATH = "/so";

export function manifestToDef(m: AppManifest): AppDef {
  const Icon = ICONS[m.icon] ?? AppWindow;
  let render: () => ReactNode;
  if (m.kind === "internal") {
    render = INTERNAL_RENDERERS[m.slug] ?? (() => <MissingApp slug={m.slug} />);
  } else {
    const src = `${PUBLIC_PATH}/${m.basePath ?? m.slug}/`;
    render = () => <IframeApp src={src} title={m.label} />;
  }
  return {
    id: m.slug,
    label: m.label,
    Icon,
    render,
    defaultSize: m.defaultSize,
    kind: m.kind,
  };
}

function MissingApp({ slug }: { slug: string }) {
  return (
    <div className="grid h-full place-items-center bg-background text-sm text-muted-foreground">
      App interno <code className="mx-1 rounded bg-card px-2 py-0.5">{slug}</code> sem renderer registrado.
    </div>
  );
}

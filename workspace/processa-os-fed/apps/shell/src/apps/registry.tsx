// =============================================================================
// Registry-driven dos apps. Shell le manifestos do server via /so/api/v1/apps
// e mapeia pra um AppDef renderizavel.
//   - kind=federated -> renderiza via Module Federation (React nativo, sem iframe)
//   - kind=internal  -> renderiza componente bundled com o shell
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
import { FederatedApp } from "./FederatedApp";

export interface AppManifest {
  slug: string;
  label: string;
  icon: string;
  kind: "internal" | "external" | "federated";
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
  kind: "internal" | "external" | "federated";
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

// Mapa de loaders para remotes federados.
// A chave eh o slug do app; o loader faz import() do modulo exposto pelo remote.
const FEDERATED_LOADERS: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  chat: () => import("chat/App"),
  notas: () => import("notas/App"),
};

export function manifestToDef(m: AppManifest): AppDef {
  const Icon = ICONS[m.icon] ?? AppWindow;
  let render: () => ReactNode;
  if (m.kind === "internal") {
    render = INTERNAL_RENDERERS[m.slug] ?? (() => <MissingApp slug={m.slug} />);
  } else if (m.kind === "federated") {
    const loader = FEDERATED_LOADERS[m.slug];
    if (loader) {
      render = () => <FederatedApp name={m.slug} loader={loader} />;
    } else {
      render = () => <MissingApp slug={m.slug} />;
    }
  } else {
    // fallback: qualquer kind desconhecido
    render = () => <MissingApp slug={m.slug} />;
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
      App <code className="mx-1 rounded bg-card px-2 py-0.5">{slug}</code> sem renderer registrado.
    </div>
  );
}

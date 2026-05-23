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
import { RelogioApp } from "./RelogioApp";
import { FederatedApp } from "./FederatedApp";
import { SettingsApp } from "../components/SettingsApp";

export interface AppManifest {
  slug: string;
  label: string;
  icon: string;
  kind: "internal" | "external" | "federated";
  basePath?: string;
  devPort?: number;
  defaultSize: { w: number; h: number };
  order: number;
  multi?: boolean;
  defaultPath?: string;
}

/**
 * Contrato app↔shell. Todo app (interno ou federado) recebe estas props
 * quando montado pelo runtime do shell. Permite multi-instância (desktop)
 * com isolamento de estado por instanceId, deep-link via initialPath e
 * "Duplicar com path corrente" via onPathChange.
 */
export interface AppInstanceProps {
  /** Identificador único desta instância de janela (no desktop) ou do app (mobile). */
  instanceId: string;
  /** Rota inicial sugerida pelo shell. App deve usar como entrada do roteamento interno. */
  initialPath?: string;
  /** Callback opcional: app reporta a rota corrente. Shell usa para "Duplicar". */
  onPathChange?: (path: string) => void;
  /** Callback opcional: app reporta um título dinâmico. Shell usa no header da janela. */
  onTitleChange?: (title: string) => void;
  /** Form-factor onde o app está rodando. */
  formFactor: "desktop" | "mobile";
}

export interface AppDef {
  id: string;
  label: string;
  Icon: LucideIcon;
  render: (props: AppInstanceProps) => ReactNode;
  defaultSize?: { w: number; h: number };
  kind: "internal" | "external" | "federated";
  multi?: boolean;
  defaultPath?: string;
}

const ICONS: Record<string, LucideIcon> = {
  MessageCircle,
  StickyNote,
  FolderOpen,
  Settings,
  Clock: ClockIcon,
};

const INTERNAL_RENDERERS: Record<string, (props: AppInstanceProps) => ReactNode> = {
  arquivos: () => <ArquivosApp />,
  relogio: () => <RelogioApp />,
  // sistema = SettingsApp, componente unico que adapta layout via formFactor.
  sistema: (props) => <SettingsApp {...props} />,
};

// Mapa de loaders para remotes federados.
// A chave eh o slug do app; o loader faz import() do modulo exposto pelo remote.
const FEDERATED_LOADERS: Record<
  string,
  () => Promise<{ default: React.ComponentType<AppInstanceProps> }>
> = {
  chat: () => import("chat/App"),
  notas: () => import("notas/App"),
};

export function manifestToDef(m: AppManifest): AppDef {
  const Icon = ICONS[m.icon] ?? AppWindow;
  let render: (props: AppInstanceProps) => ReactNode;
  if (m.kind === "internal") {
    render = INTERNAL_RENDERERS[m.slug] ?? (() => <MissingApp slug={m.slug} />);
  } else if (m.kind === "federated") {
    const loader = FEDERATED_LOADERS[m.slug];
    if (loader) {
      render = (props) => <FederatedApp name={m.slug} loader={loader} appProps={props} />;
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
    multi: m.multi,
    defaultPath: m.defaultPath,
  };
}

function MissingApp({ slug }: { slug: string }) {
  return (
    <div className="grid h-full place-items-center bg-background text-sm text-muted-foreground">
      App <code className="mx-1 rounded bg-card px-2 py-0.5">{slug}</code> sem renderer registrado.
    </div>
  );
}

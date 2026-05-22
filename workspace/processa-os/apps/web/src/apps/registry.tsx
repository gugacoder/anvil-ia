import { MessageCircle, StickyNote, FolderOpen, Settings, Clock as ClockIcon, type LucideIcon } from "lucide-react";
import { ChatApp } from "./ChatApp";
import { NotasApp } from "./NotasApp";
import { ArquivosApp } from "./ArquivosApp";
import { SistemaApp } from "./SistemaApp";
import { RelogioApp } from "./RelogioApp";
import type { ReactNode } from "react";

export interface AppDef {
  id: string;
  label: string;
  Icon: LucideIcon;
  render: () => ReactNode;
  defaultSize?: { w: number; h: number };
}

export const APPS: AppDef[] = [
  {
    id: "chat",
    label: "Anvil Chat",
    Icon: MessageCircle,
    render: () => <ChatApp />,
    defaultSize: { w: 920, h: 620 },
  },
  {
    id: "notas",
    label: "Notas",
    Icon: StickyNote,
    render: () => <NotasApp />,
    defaultSize: { w: 780, h: 540 },
  },
  {
    id: "arquivos",
    label: "Arquivos",
    Icon: FolderOpen,
    render: () => <ArquivosApp />,
    defaultSize: { w: 720, h: 500 },
  },
  {
    id: "relogio",
    label: "Relógio",
    Icon: ClockIcon,
    render: () => <RelogioApp />,
    defaultSize: { w: 540, h: 380 },
  },
  {
    id: "sistema",
    label: "Sistema",
    Icon: Settings,
    render: () => <SistemaApp />,
    defaultSize: { w: 560, h: 440 },
  },
];

export function getApp(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id);
}

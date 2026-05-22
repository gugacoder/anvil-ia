import { Check, Download, FileText, FilePlus, FolderSearch, Globe, Loader2, Pencil, Search, Terminal, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils.js";
import { useTranslation } from "../i18n/index.js";

export type ToolActivityState = "call" | "partial-call" | "result";

export interface ToolActivityProps {
  toolName: string;
  state: ToolActivityState;
  args?: Record<string, unknown>;
  className?: string;
  iconMap?: Partial<Record<string, LucideIcon>>;
}

export const defaultToolIconMap: Record<string, LucideIcon> = {
  WebSearch: Globe,
  Bash: Terminal,
  Read: FileText,
  Edit: Pencil,
  Write: FilePlus,
  Grep: Search,
  Glob: FolderSearch,
  WebFetch: Download,
  ListDir: FolderSearch,
};

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveIcon(toolName: string, iconMap: Record<string, LucideIcon | undefined>): LucideIcon {
  return iconMap[toolName] ?? Wrench;
}

function formatArgs(toolName: string, args?: Record<string, unknown>): string | null {
  if (!args) return null;
  if (toolName === "Bash" && args.command) return String(args.command);
  if (toolName === "Read" && args.path) return String(args.path);
  if (toolName === "Edit" && args.file_path) return String(args.file_path);
  if (toolName === "Write" && args.file_path) return String(args.file_path);
  if (toolName === "Grep" && args.pattern) return String(args.pattern);
  if (toolName === "Glob" && args.pattern) return String(args.pattern);
  if (toolName === "WebSearch" && args.query) return String(args.query);
  if (toolName === "ListDir" && args.path) return String(args.path);
  return null;
}

export function ToolActivity({ toolName, state, args, className, iconMap }: ToolActivityProps) {
  const { t } = useTranslation();
  const mergedIconMap = iconMap ? { ...defaultToolIconMap, ...iconMap } : defaultToolIconMap;
  const Icon = resolveIcon(toolName, mergedIconMap);
  const isActive = state === "call" || state === "partial-call";
  const displayName = formatToolName(toolName);
  const argsPreview = formatArgs(toolName, args);
  const elapsedMs = args?._elapsedMs as number | undefined;

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm",
      className
    )}>
      <span className="text-muted-foreground shrink-0" aria-hidden="true">
        <Icon size={14} />
      </span>
      <span className="font-medium font-mono text-foreground">{displayName}</span>
      {argsPreview && (
        <span className="truncate text-xs text-muted-foreground font-mono max-w-[300px]">{argsPreview}</span>
      )}
      {isActive && elapsedMs != null && elapsedMs > 0 && (
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {(elapsedMs / 1000).toFixed(1)}s
        </span>
      )}
      <span className="ml-auto text-muted-foreground">
        {isActive ? (
          <Loader2 size={14} className="animate-spin" aria-label={t("tool.running")} />
        ) : (
          <Check size={14} aria-label={t("tool.done")} />
        )}
      </span>
    </div>
  );
}

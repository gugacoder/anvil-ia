import { Check, X, Loader2, Square, FileText } from "lucide-react";
import { cn } from "../lib/utils.js";

export type TaskStatus = "in_progress" | "completed" | "failed" | "stopped";

export interface TaskCardProps {
  description: string;
  status: TaskStatus;
  summary?: string;
  toolUses?: number;
  totalTokens?: number;
  outputFile?: string;
  className?: string;
}

const statusConfig: Record<TaskStatus, { icon: typeof Loader2; label: string; color: string }> = {
  in_progress: { icon: Loader2, label: "In Progress", color: "text-blue-500" },
  completed: { icon: Check, label: "Completed", color: "text-green-500" },
  failed: { icon: X, label: "Failed", color: "text-red-500" },
  stopped: { icon: Square, label: "Stopped", color: "text-muted-foreground" },
};

export function TaskCard({ description, status, summary, toolUses, totalTokens, outputFile, className }: TaskCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-lg border bg-muted/30 px-4 py-3 text-sm",
      className,
    )}>
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          className={cn(config.color, status === "in_progress" && "animate-spin")}
        />
        <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
      </div>
      <p className="mt-1 text-foreground">{description}</p>

      {summary && (
        <p className="mt-2 text-xs text-muted-foreground">{summary}</p>
      )}

      {(toolUses != null || totalTokens != null) && (
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          {toolUses != null && <span>{toolUses} tool calls</span>}
          {totalTokens != null && <span>{(totalTokens / 1000).toFixed(1)}k tokens</span>}
        </div>
      )}

      {outputFile && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <FileText size={12} />
          <span className="font-mono truncate">{outputFile}</span>
        </div>
      )}
    </div>
  );
}

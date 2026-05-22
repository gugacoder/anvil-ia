import React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../lib/utils.js";
import { Button } from "../ui/button.js";
import { Skeleton } from "../ui/skeleton.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";
import type { ModelEntry } from "../hooks/useModels.js";

export interface ModelSelectProps {
  models: ModelEntry[];
  value: string;
  onChange: (modelId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function ModelSelect({ models, value, onChange, isLoading, className }: ModelSelectProps) {
  if (models.length === 0) {
    if (!isLoading) return null;
    return <Skeleton className={cn("h-8 w-28 rounded-md", className)} />;
  }

  const selected = models.find((m) => m.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1 text-xs font-normal", className)}>
          {selected?.label ?? value}
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {models.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onSelect={() => onChange(m.id)}
            className="gap-2 text-xs"
          >
            <Check className={cn("size-3", m.id === value ? "opacity-100" : "opacity-0")} />
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

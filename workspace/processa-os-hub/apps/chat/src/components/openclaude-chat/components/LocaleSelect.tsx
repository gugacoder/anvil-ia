import React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/utils.js";
import { Button } from "../ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";
import { useTranslation } from "../i18n/index.js";

export interface LocaleSelectProps {
  value: string;
  onChange: (locale: string) => void;
  className?: string;
}

export function LocaleSelect({ value, onChange, className }: LocaleSelectProps) {
  const { supportedLocales } = useTranslation();
  const current = supportedLocales.find((l) => l.slug === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("gap-1 text-xs font-normal px-2", className)}>
          <span className="text-base leading-none">{current?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {supportedLocales.map((l) => (
          <DropdownMenuItem
            key={l.slug}
            onSelect={() => onChange(l.slug)}
            className="gap-2 text-xs"
          >
            <Check className={cn("size-3", l.slug === value ? "opacity-100" : "opacity-0")} />
            <span className="text-base leading-none">{l.flag}</span>
            {l.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

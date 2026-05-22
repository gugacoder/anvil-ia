import { useEffect, useState } from "react";

export interface ModelEntry {
  id: string;
  label: string;
  owned_by: string;
  context_window?: number | null;
  supports_vision?: boolean | null;
}

export interface UseModelsReturn {
  models: ModelEntry[];
  defaultModel: string | null;
  isLoading: boolean;
}

const cache = new Map<string, { models: ModelEntry[]; defaultModel: string | null }>();

export function useModels(endpoint: string, fetcher?: typeof fetch): UseModelsReturn {
  const [models, setModels] = useState<ModelEntry[]>(() => cache.get(endpoint)?.models ?? []);
  const [defaultModel, setDefaultModel] = useState<string | null>(() => cache.get(endpoint)?.defaultModel ?? null);
  const [isLoading, setIsLoading] = useState(!!endpoint && !cache.has(endpoint));

  useEffect(() => {
    if (!endpoint || cache.has(endpoint)) return;

    let cancelled = false;
    const doFetch = fetcher ?? fetch;

    doFetch(`${endpoint}/models`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { data?: Array<{ id: string; label?: string; owned_by?: string; context_window?: number; supports_vision?: boolean }>; default_model?: string }) => {
        if (cancelled) return;
        const entries: ModelEntry[] = (data.data ?? []).map((m) => ({
          id: m.id,
          label: m.label ?? m.id,
          owned_by: m.owned_by ?? "unknown",
          context_window: m.context_window ?? null,
          supports_vision: m.supports_vision ?? null,
        }));
        const def = data.default_model ?? null;
        cache.set(endpoint, { models: entries, defaultModel: def });
        setModels(entries);
        setDefaultModel(def);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [endpoint, fetcher]);

  return { models, defaultModel, isLoading };
}

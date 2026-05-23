import { useEffect, useState } from "react";
import { type AppDef, manifestToDef } from "../apps/registry";
import { AppsListResponseSchema, safeParseWithWarn } from "./schemas";

export function useApps(): { apps: AppDef[]; loading: boolean; error: string | null } {
  const [apps, setApps] = useState<AppDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/so/api/v1/apps", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((raw: unknown) => {
        if (cancelled) return;
        const parsed = safeParseWithWarn(AppsListResponseSchema, raw, "apps.list", { apps: [] });
        setApps(parsed.apps.map(manifestToDef));
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { apps, loading, error };
}

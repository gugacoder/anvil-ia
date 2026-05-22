import { useEffect, useState } from "react";
import { type AppDef, type AppManifest, manifestToDef } from "../apps/registry";

export function useApps(): { apps: AppDef[]; loading: boolean; error: string | null } {
  const [apps, setApps] = useState<AppDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/so/api/v1/apps", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { apps: AppManifest[] }) => {
        if (cancelled) return;
        setApps(d.apps.map(manifestToDef));
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

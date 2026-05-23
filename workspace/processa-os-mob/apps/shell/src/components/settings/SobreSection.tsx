export function SobreSection() {
  const meta = import.meta as ImportMeta & { env?: { MODE?: string } };
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Sobre</h2>
        <p className="text-xs text-muted-foreground">Processa OS.</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <InfoRow label="Versão" value="0.1.0" />
        <InfoRow label="Edition" value="mob" />
        <InfoRow label="Shell" value="@mob/shell" />
        <InfoRow label="Build" value={meta.env?.MODE ?? "dev"} />
      </dl>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/60 px-3 py-2 ring-1 ring-border/30">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

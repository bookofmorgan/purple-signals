import { Card } from "@/components/ui/card";

export function ResponseRateCard({ responded, total, rate }: { responded: number; total: number; rate: number }) {
  const pct = Math.max(0, Math.min(100, Number(rate) || 0));
  return (
    <Card className="p-6 space-y-3">
      <div className="text-sm text-muted-foreground">Response rate</div>
      <div className="text-3xl font-semibold tabular-nums">{responded}/{total}</div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}%</div>
    </Card>
  );
}

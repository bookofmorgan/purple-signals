import { Card } from "@/components/ui/card";

export function OverallScore({ value, strongAreas, total }: { value: number; strongAreas: number; total: number }) {
  return (
    <Card className="p-6">
      <div className="text-sm text-muted-foreground">Leadership health</div>
      <div className="flex items-end gap-3">
        <div className="text-6xl font-semibold tabular-nums tracking-tight">{value.toFixed(1)}</div>
        <div className="text-muted-foreground pb-2">/ 10</div>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {strongAreas} of {total} categories rated strong (≥ 7.2)
      </div>
    </Card>
  );
}

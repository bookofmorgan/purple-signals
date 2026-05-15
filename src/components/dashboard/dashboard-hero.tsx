import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface Props {
  overall: number;
  overallDelta: number | null;          // vs prior cycle (null if no prior)
  responseRate: { responded: number; total: number; rate: number };
  strongAreas: number;
  totalAreas: number;
}

function deltaLabel(d: number | null): string {
  if (d === null) return "First cycle";
  if (Math.abs(d) < 0.05) return "no change vs last cycle";
  return `${d > 0 ? "+" : ""}${d.toFixed(1)} vs last cycle`;
}

function tone(score: number): string {
  if (score >= 7.2) return "Strong";
  if (score < 6) return "Needs focus";
  return "Progressing";
}

export function DashboardHero({ overall, overallDelta, responseRate, strongAreas, totalAreas }: Props) {
  const Trend = overallDelta == null || Math.abs(overallDelta) < 0.05
    ? Minus
    : overallDelta > 0 ? ArrowUp : ArrowDown;
  const trendClasses =
    overallDelta == null || Math.abs(overallDelta) < 0.05
      ? "text-muted-foreground"
      : overallDelta > 0
        ? "text-strong"
        : "text-attention";

  const pct = Math.max(0, Math.min(100, Number(responseRate.rate) || 0));

  return (
    <Card className="p-6 md:p-8 grid md:grid-cols-[1.6fr_1fr_0.8fr] gap-6 items-center">
      {/* Overall */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground">
          LEADERSHIP HEALTH
        </div>
        <div className="flex items-end gap-3">
          <div className="text-6xl font-semibold tabular-nums tracking-tight leading-none">
            {overall.toFixed(1)}
          </div>
          <div className="text-muted-foreground pb-1.5">/ 10</div>
          <Badge variant="outline" className={`gap-1 ml-2 mb-1.5 ${trendClasses}`}>
            <Trend className="h-3 w-3" />
            <span className="tabular-nums">{deltaLabel(overallDelta)}</span>
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Across six leadership dimensions · {tone(overall)}
        </div>
      </div>

      {/* Response rate */}
      <div className="space-y-1.5 md:border-l md:pl-6">
        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground">
          RESPONSE RATE
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{pct.toFixed(0)}%</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {responseRate.responded} of {responseRate.total}
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Strong areas */}
      <div className="space-y-1.5 md:border-l md:pl-6">
        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground">
          STRONG AREAS
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tabular-nums text-strong">{strongAreas}</span>
          <span className="text-xs text-muted-foreground">/ {totalAreas} dimensions</span>
        </div>
      </div>
    </Card>
  );
}

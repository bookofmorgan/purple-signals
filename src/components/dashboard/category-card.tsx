import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CategoryStatus } from "@/lib/types";

interface Props {
  name: string;
  description?: string | null;
  score: number;
  delta: number;
  status: CategoryStatus;
}

const labels: Record<CategoryStatus, string> = {
  strong: "Strong",
  needs_attention: "Needs Attention",
  stable: "Stable"
};
const badgeVariants: Record<CategoryStatus, "strong" | "attention" | "stable"> = {
  strong: "strong",
  needs_attention: "attention",
  stable: "stable"
};
// Leading dot + progress-bar fill colour mapping (same as badge but solid swatches)
const dotClasses: Record<CategoryStatus, string> = {
  strong: "bg-strong",
  needs_attention: "bg-attention",
  stable: "bg-primary"
};
const barClasses: Record<CategoryStatus, string> = {
  strong: "bg-strong",
  needs_attention: "bg-attention",
  stable: "bg-primary"
};

export function CategoryCard({ name, description, score, delta, status }: Props) {
  const Trend = delta > 0.05 ? TrendingUp : delta < -0.05 ? TrendingDown : Minus;
  const trendColour =
    delta > 0.05 ? "text-strong" : delta < -0.05 ? "text-attention" : "text-muted-foreground";
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-block h-2 w-2 rounded-full ${dotClasses[status]}`} />
            <h3 className="font-semibold truncate">{name}</h3>
          </div>
          <Badge variant={badgeVariants[status]} className="text-[10px] uppercase tracking-wide shrink-0">
            {labels[status]}
          </Badge>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-1">
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-semibold tabular-nums tracking-tight">
              {score.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/10</span>
          </div>
          <div className={`flex items-center gap-1 text-sm ${trendColour}`}>
            <Trend className="h-4 w-4" />
            <span className="tabular-nums">
              {delta > 0 ? "+" : ""}{delta.toFixed(1)}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full ${barClasses[status]} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

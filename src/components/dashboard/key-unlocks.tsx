import { Lightbulb } from "lucide-react";

interface Category { id: string; name: string; score: number; delta: number; status: "strong" | "needs_attention" | "stable" }

interface Insight { title: string; body: string }

/**
 * Derive 2–3 plain-English insights from the latest cycle's category set.
 * Pure derivation — no extra data needed.
 *
 *  1. Largest negative delta (regression) → "X is slipping"
 *  2. Largest positive delta (improvement) → "X is strengthening"
 *  3. Lowest absolute score below 6 → "X could be strengthened"
 *
 * Deduped: if the same category would be surfaced twice, prefer the regression
 * framing over the absolute-low framing.
 */
function deriveInsights(categories: Category[]): Insight[] {
  if (!categories || categories.length === 0) return [];
  const sortedByDelta = [...categories].sort((a, b) => a.delta - b.delta);
  const biggestDrop = sortedByDelta[0];
  const biggestRise = sortedByDelta[sortedByDelta.length - 1];
  const lowestScore = [...categories].sort((a, b) => a.score - b.score)[0];

  const insights: Insight[] = [];
  const seen = new Set<string>();

  if (biggestDrop && biggestDrop.delta < -0.2) {
    insights.push({
      title: `${biggestDrop.name} is slipping`,
      body: `${biggestDrop.name} dropped ${Math.abs(biggestDrop.delta).toFixed(1)} points to ${biggestDrop.score.toFixed(1)}/10 — the largest decline this cycle.`
    });
    seen.add(biggestDrop.id);
  }

  if (lowestScore && lowestScore.score < 6 && !seen.has(lowestScore.id)) {
    insights.push({
      title: `${lowestScore.name} could be strengthened`,
      body: `${lowestScore.name} scored ${lowestScore.score.toFixed(1)}/10 — the lowest dimension this cycle. A focused intervention here is high-leverage.`
    });
    seen.add(lowestScore.id);
  }

  if (biggestRise && biggestRise.delta > 0.2 && !seen.has(biggestRise.id)) {
    insights.push({
      title: `${biggestRise.name} is strengthening`,
      body: `${biggestRise.name} rose ${biggestRise.delta.toFixed(1)} points to ${biggestRise.score.toFixed(1)}/10 — keep doing what's working.`
    });
    seen.add(biggestRise.id);
  }

  // If the cycle was flat, surface the strongest stable area as positive reinforcement.
  if (insights.length === 0) {
    const strongest = [...categories].sort((a, b) => b.score - a.score)[0];
    if (strongest) {
      insights.push({
        title: `${strongest.name} is your strongest area`,
        body: `${strongest.name} scored ${strongest.score.toFixed(1)}/10. Consider what's working here that could translate to other dimensions.`
      });
    }
  }

  return insights.slice(0, 3);
}

export function KeyUnlocks({ categories }: { categories: Category[] }) {
  const insights = deriveInsights(categories);
  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl border bg-yellow-50 dark:bg-yellow-950/30 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-yellow-200 dark:bg-yellow-900 grid place-items-center">
          <Lightbulb className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
        </div>
        <div>
          <div className="font-semibold text-sm">Key Unlocks</div>
          <div className="text-xs text-muted-foreground">What just became clear</div>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((i, idx) => (
          <div key={idx} className="rounded-lg bg-card border p-3 space-y-1">
            <div className="font-medium text-sm">{i.title}</div>
            <div className="text-sm text-muted-foreground leading-snug">{i.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

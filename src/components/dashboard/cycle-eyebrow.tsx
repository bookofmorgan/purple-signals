import { Card } from "@/components/ui/card";

interface Props {
  title: string;                                 // e.g. "Leadership Health"
  cycle: { title: string; status?: string; cadence?: string } | null;
}

/**
 * Eyebrow header: bold page title with a small "Cycle · status · cadence" tag.
 * Matches the screenshot's "Leadership Health / Cycle 9 · Active · Monthly pulse".
 */
export function CycleEyebrow({ title, cycle }: Props) {
  return (
    <Card className="px-4 py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 className="text-lg font-semibold">{title}</h1>
      {cycle && (
        <div className="text-sm text-muted-foreground">
          {cycle.title}
          {cycle.status && <> · <span className="capitalize">{cycle.status}</span></>}
          {cycle.cadence && <> · {cycle.cadence}</>}
        </div>
      )}
    </Card>
  );
}

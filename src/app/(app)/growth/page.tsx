import Link from "next/link";
import { ArrowRight, BookOpen, MessageSquareText, Target, Sparkles, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CycleEyebrow } from "@/components/dashboard/cycle-eyebrow";

export const dynamic = "force-dynamic";

export default async function GrowthHubPage() {
  await requireRole(["leader", "employee"]);

  // Articles via RLS-scoped client.
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, description, url, read_time_min, category_id, categories(name)")
    .eq("is_active", true)
    .order("sort_order")
    .limit(6);

  return (
    <div className="space-y-6">
      <CycleEyebrow title="Individual Growth" cycle={{ title: "Your personal leadership development hub" }} />

      {/* Three workspace cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Your Growth Workspaces</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <WorkspaceCard
            href="/growth/notes"
            tone="primary"
            icon={<MessageSquareText className="h-5 w-5" />}
            title="Coaching Notes & Insights"
            description="Capture key moments, reflections, and takeaways from your coaching sessions in one place."
          />
          <WorkspaceCard
            href="/growth/plan"
            tone="strong"
            icon={<Target className="h-5 w-5" />}
            title="Personal Development Plan"
            description="Define how you're growing as a leader — goals, milestones, and the practices you're committing to."
          />
          <WorkspaceCard
            href="/growth/coach"
            tone="attention"
            icon={<Sparkles className="h-5 w-5" />}
            title="AI Leadership Coach"
            description="Your on-demand coaching companion — ask questions, work through challenges, and grow into the leader you can be."
            badge="Live"
          />
        </div>
      </div>

      {/* Articles */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-yellow-600" />
          <h2 className="text-base font-semibold">Leadership Articles</h2>
        </div>
        <Card>
          <ul className="divide-y">
            {(articles ?? []).map((a) => {
              const category = (a as unknown as { categories?: { name: string } | null }).categories?.name;
              return (
                <li key={a.id}>
                  <a href={a.url} target="_blank" rel="noreferrer"
                     className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-accent/40 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-yellow-100 grid place-items-center shrink-0">
                        <FileText className="h-4 w-4 text-yellow-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{a.title}</div>
                        {a.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
                        )}
                        {category && (
                          <Badge variant="outline" className="mt-2 text-[10px] uppercase tracking-wide">
                            {category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {a.read_time_min && (
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{a.read_time_min} min</span>
                    )}
                  </a>
                </li>
              );
            })}
            {(!articles || articles.length === 0) && (
              <li className="p-6 text-sm text-muted-foreground">No articles yet — admin can add them in /admin/articles.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function WorkspaceCard({
  href, tone, icon, title, description, badge
}: {
  href: string;
  tone: "primary" | "strong" | "attention";
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  const toneBg =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "strong"
        ? "bg-strong/10 text-strong"
        : "bg-yellow-100 text-yellow-700";
  return (
    <Link href={href} className="block group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className={`h-9 w-9 rounded-lg grid place-items-center ${toneBg}`}>{icon}</div>
            {badge && <Badge variant="outline" className="text-[10px] uppercase">{badge}</Badge>}
          </div>
          <CardTitle className="text-base mt-3">{title}</CardTitle>
          <CardDescription className="text-sm leading-snug">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-xs text-primary inline-flex items-center gap-1 group-hover:underline">
            Open <ArrowRight className="h-3 w-3" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

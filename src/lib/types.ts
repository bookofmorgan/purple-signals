// Hand-written DB types matching supabase/migrations/*.sql.
// These mirror the system design contract; regenerate from `supabase gen types typescript`
// once a schema reaches steady state.

export type Role = "super_admin" | "leader" | "employee";
export type CycleStatus = "draft" | "open" | "closed";
export type GoalStatus = "not_started" | "in_progress" | "complete";
export type CategoryStatus = "strong" | "stable" | "needs_attention";

export interface Org {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  org_id: string | null;
  email: string;
  name: string;
  role: Role;
  title: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface Question {
  id: string;
  category_id: string;
  text: string;
  is_active: boolean;
  created_at: string;
}

export interface Cycle {
  id: string;
  org_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: CycleStatus;
  created_at: string;
}

export interface CategoryScore {
  category_id: string;
  category_name: string;
  avg_score: number;
  response_count: number;
  respondent_count: number;
}

export interface CategoryTrend {
  category_id: string;
  category_name: string;
  current_score: number;
  previous_score: number | null;
  delta: number;
  status: CategoryStatus;
}

export interface ResponseRate {
  responded: number;
  total: number;
  rate: number;
}

export interface CoachingNote {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DevPlanGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category_id: string | null;
  read_time_min: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CoachConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
}

export interface CoachMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

// API contracts
export interface DashboardScoresPayload {
  overall_score: number;
  categories: {
    id: string;
    name: string;
    score: number;
    delta: number;
    status: CategoryStatus;
  }[];
  response_rate: ResponseRate;
  strong_areas: number;
  cycle: { id: string; title: string; ends_at: string };
}

export interface DashboardScoresInsufficient {
  insufficient_responses: true;
  response_rate: ResponseRate;
  cycle: { id: string; title: string; ends_at: string } | null;
}

export interface EmployeeDashboardPayload {
  overall_score: number;
  strongest: { name: string; score: number } | null;
  weakest: { name: string; score: number } | null;
  recommended_articles: Pick<
    Article,
    "id" | "title" | "description" | "url" | "read_time_min"
  >[];
  cycle: { id: string; title: string; ends_at: string };
}

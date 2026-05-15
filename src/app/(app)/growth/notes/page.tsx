import { requireRole } from "@/lib/auth-helpers";
import NotesClient from "./notes-client";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  await requireRole(["leader", "employee"]);
  return <NotesClient />;
}

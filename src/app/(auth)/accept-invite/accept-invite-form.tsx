"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Supabase invite flow.
 *
 * Local dev (no email server): super_admin creates the user via the admin API,
 * Supabase generates an invite link of the form
 *   /accept-invite?token_hash=...&type=invite&next=/
 * (or the older /#access_token=... fragment, depending on email-confirm settings).
 *
 * This page handles both: it exchanges the token for a session, then asks the user
 * to set a password.
 */
export default function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [stage, setStage] = useState<"verifying" | "setPassword" | "done" | "error">("verifying");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Newer Supabase flow: ?token_hash=...&type=invite
      const tokenHash = params.get("token_hash");
      const type = params.get("type") as "invite" | "recovery" | "magiclink" | null;
      if (tokenHash && type) {
        const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (cancelled) return;
        if (err) { setError(err.message); setStage("error"); return; }
        setStage("setPassword");
        return;
      }

      // Older flow: tokens in URL hash (#access_token=…&refresh_token=…)
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access = hash.get("access_token");
        const refresh = hash.get("refresh_token");
        if (access && refresh) {
          const { error: err } = await supabase.auth.setSession({
            access_token: access, refresh_token: refresh
          });
          if (cancelled) return;
          if (err) { setError(err.message); setStage("error"); return; }
          setStage("setPassword");
          return;
        }
      }

      // Already-signed-in fallback (rare but possible if the user clicked the link
      // again from the same browser).
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setStage("setPassword"); return; }

      setError("This invite link is missing or expired. Ask your admin to re-send.");
      setStage("error");
    })();

    return () => { cancelled = true; };
  }, [params, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSubmitting(true); setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setStage("done");
    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Accept your invite</CardTitle>
        <CardDescription>Set a password to finish setting up your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {stage === "verifying" && <p className="text-sm text-muted-foreground">Verifying invite…</p>}
        {stage === "error" && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {stage === "setPassword" && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" required value={password}
                     onChange={(e) => setPassword(e.target.value)} minLength={8}
                     autoComplete="new-password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : "Set password & continue"}
            </Button>
          </form>
        )}
        {stage === "done" && <p className="text-sm">All set — taking you in…</p>}
      </CardContent>
    </Card>
  );
}

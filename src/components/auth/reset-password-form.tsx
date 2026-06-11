"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (updateError) return setError("This reset link is invalid or expired. Request a new one.");
    await supabase.auth.signOut();
    router.push("/login?passwordUpdated=1");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md p-6">
      <h1 className="text-2xl font-bold text-ink">Choose a new password</h1>
      <p className="mt-2 text-sm text-slate-600">Use at least 8 characters.</p>
      <div className="mt-6 space-y-4">
        <label className="block"><span className="label">New password</span><input type="password" required className="field" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="block"><span className="label">Confirm password</span><input type="password" required className="field" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
      </div>
      {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <button type="submit" className="btn-primary mt-5 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {isSubmitting ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setIsSubmitting(false);
    setSent(true);
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md p-6">
      <h1 className="text-2xl font-bold text-ink">Reset your password</h1>
      <p className="mt-2 text-sm text-slate-600">Enter your account email and we will send a secure reset link.</p>
      <label className="mt-6 block">
        <span className="label">Email</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" className="field" />
      </label>
      {sent ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">If an account exists for this email, a password reset link has been sent.</p> : null}
      <button type="submit" className="btn-primary mt-5 w-full" disabled={isSubmitting || sent}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {isSubmitting ? "Sending..." : "Send reset link"}
      </button>
      <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-brand-blue">Back to login</Link>
    </form>
  );
}

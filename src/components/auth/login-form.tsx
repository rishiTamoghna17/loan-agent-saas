"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
import { loginSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";
import type { z } from "zod";

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm({ redirectedFrom, email }: { redirectedFrom?: string; email?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: email ?? "", password: "" }
  });

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    setServerError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    setIsSubmitting(false);

    if (error) {
      setServerError(error.message);
      return;
    }

    router.push(redirectedFrom ?? "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="card w-full max-w-md p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Open your loan lead dashboard.</p>
        {email ? <p className="mt-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">Account created. Confirm your email, then log in.</p> : null}
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field" {...form.register("email")} />
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.email?.message}</p>
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="field" {...form.register("password")} />
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.password?.message}</p>
        </div>
      </div>

      {serverError ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</p> : null}

      <button type="submit" className="btn-primary mt-6 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {isSubmitting ? "Logging in..." : "Login"}
      </button>

      <p className="mt-5 text-center text-sm text-slate-600">
        New agent?{" "}
        <Link href="/signup" className="font-semibold text-brand-blue">Create an account</Link>
      </p>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ConfirmEmailSession({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function finishConfirmation() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session) {
        router.replace(next);
        router.refresh();
        return;
      }

      const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active || !nextSession) return;
        router.replace(next);
        router.refresh();
      });

      window.setTimeout(() => {
        if (active) setError("The confirmation link is invalid or has expired.");
        subscription.subscription.unsubscribe();
      }, 8000);
    }

    void finishConfirmation();
    return () => {
      active = false;
    };
  }, [next, router]);

  return (
    <section className="card w-full max-w-md p-6 text-center">
      {error ? (
        <>
          <CheckCircle2 className="mx-auto h-9 w-9 text-slate-400" />
          <h1 className="mt-4 text-xl font-bold text-ink">Confirmation link unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <Link href="/login" className="btn-primary mt-6 w-full">
            Go to login
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-brand-blue" />
          <h1 className="mt-4 text-xl font-bold text-ink">Confirming your LeadHub account</h1>
          <p className="mt-2 text-sm text-slate-600">You will be redirected to your dashboard shortly.</p>
        </>
      )}
    </section>
  );
}

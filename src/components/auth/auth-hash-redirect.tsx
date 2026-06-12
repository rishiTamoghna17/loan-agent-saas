"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!window.location.hash.includes("access_token=")) return;

    const supabase = createClient();
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken) return;

    void supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    }).then(({ error }) => {
      window.history.replaceState(null, "", window.location.pathname);
      if (error) {
        router.replace("/login?error=invalid_confirmation");
        return;
      }
      router.replace(type === "recovery" ? "/reset-password" : "/dashboard");
      router.refresh();
    });
  }, [router]);

  return null;
}

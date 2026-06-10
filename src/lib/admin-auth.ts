import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdminUser(options: { redirectOnFailure?: boolean } = {}) {
  const { redirectOnFailure = false } = options;
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    if (redirectOnFailure) redirect("/login");
    throw new Error("Unauthorized");
  }

  const email = user.email?.toLowerCase();
  if (!email || !getAdminEmails().includes(email)) {
    if (redirectOnFailure) redirect("/dashboard");
    throw new Error("Unauthorized");
  }

  return user;
}

export async function getAdminSupabase() {
  await requireAdminUser();
  return createAdminClient();
}


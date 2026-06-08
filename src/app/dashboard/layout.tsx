import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, LogOut, UserRoundCog } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { LeadHubMark } from "@/components/brand/lead-hub-mark";
import { PendingButton } from "@/components/ui/pending-button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent } = await supabase
    .from("agents")
    .select("agent_name,business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2">
              <LeadHubMark className="h-8 w-8" />
              <div>
                <p className="text-lg font-bold leading-tight text-ink">LeadHub</p>
                <p className="text-xs font-medium text-slate-500">Lead Generation • CRM • Follow-up • Conversion</p>
              </div>
            </Link>
            {/* {agent ? (
              <p className="mt-1 max-w-sm truncate text-sm text-slate-600">
                {agent.agent_name} · {agent.business_name}
              </p>
            ) : null} */}
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="btn-secondary">
              <LayoutDashboard className="h-4 w-4" />
              Leads
            </Link>
            <Link href="/dashboard/profile" className="btn-secondary">
              <UserRoundCog className="h-4 w-4" />
              Profile
            </Link>
            <form action={logout}>
              <PendingButton className="btn-secondary" pendingText="Logging out...">
                <LogOut className="h-4 w-4" />
                Logout
              </PendingButton>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}

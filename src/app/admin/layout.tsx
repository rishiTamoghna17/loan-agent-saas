import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  BarChart3, 
  TrendingUp, 
  LogOut 
} from "lucide-react";
import { logout } from "@/app/auth/actions";
import { LeadHubMark } from "@/components/brand/lead-hub-mark";
import { PendingButton } from "@/components/ui/pending-button";
import { requireAdminUser } from "@/lib/admin-auth";
import { NavLink } from "@/components/admin/nav-link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminUser({ redirectOnFailure: true });

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href="/admin" className="flex items-center gap-2">
              <LeadHubMark className="h-8 w-8 text-primary" />
              <div>
                <p className="text-lg font-bold leading-tight text-ink">LeadHub Admin</p>
                <p className="text-xs font-medium text-slate-500">Founder Dashboard • CRM • Analytics</p>
              </div>
            </Link>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink href="/admin">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </NavLink>
            <NavLink href="/admin/prospects">
              <Users className="h-4 w-4" />
              Prospects
            </NavLink>
            <NavLink href="/admin/campaigns">
              <Mail className="h-4 w-4" />
              Campaigns
            </NavLink>
            <NavLink href="/admin/analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </NavLink>
            <NavLink href="/admin/conversions">
              <TrendingUp className="h-4 w-4" />
              Conversions
            </NavLink>
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

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
            <Link href="/admin" className="btn-secondary">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </Link>
            <Link href="/admin/prospects" className="btn-secondary">
              <Users className="h-4 w-4" />
              Prospects
            </Link>
            <Link href="/admin/campaigns" className="btn-secondary">
              <Mail className="h-4 w-4" />
              Campaigns
            </Link>
            <Link href="/admin/analytics" className="btn-secondary">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
            <Link href="/admin/conversions" className="btn-secondary">
              <TrendingUp className="h-4 w-4" />
              Conversions
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

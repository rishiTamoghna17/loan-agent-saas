import { createClient } from "@/lib/supabase/server";
import { 
  Users, 
  Mail, 
  MousePointer2, 
  MessageSquare, 
  Zap, 
  CheckCircle2,
  TrendingUp,
  BarChart3
} from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  // Fetch basic stats
  const { count: totalProspects } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true });

  const { count: emailsSent } = await supabase
    .from("email_campaigns")
    .select("*", { count: "exact", head: true });

  const { count: emailsOpened } = await supabase
    .from("email_campaigns")
    .select("*", { count: "exact", head: true })
    .not("opened_at", "is", null);

  const { count: linksClicked } = await supabase
    .from("email_campaigns")
    .select("*", { count: "exact", head: true })
    .not("clicked_at", "is", null);

  const { count: replies } = await supabase
    .from("email_campaigns")
    .select("*", { count: "exact", head: true })
    .not("replied_at", "is", null);

  const { count: demoRequests } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("status", "demo_requested");

  const { count: trialsStarted } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("status", "trial_started");

  const { count: convertedCustomers } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("status", "converted");

  const stats = [
    { label: "Total Prospects", value: totalProspects || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Emails Sent", value: emailsSent || 0, icon: Mail, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Emails Opened", value: emailsOpened || 0, icon: Zap, color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: "Links Clicked", value: linksClicked || 0, icon: MousePointer2, color: "text-indigo-600", bg: "bg-indigo-100" },
    { label: "Replies", value: replies || 0, icon: MessageSquare, color: "text-pink-600", bg: "bg-pink-100" },
    { label: "Demo Requests", value: demoRequests || 0, icon: BarChart3, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Trials Started", value: trialsStarted || 0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    { label: "Converted Customers", value: convertedCustomers || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Admin Overview</h1>
        <p className="text-slate-500">Track your outreach performance and conversion pipeline.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-ink">{stat.value}</p>
              </div>
              <div className={`rounded-lg ${stat.bg} p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Placeholder for charts or recent activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-ink">Recent Prospects</h2>
          <p className="text-sm text-slate-500">Go to Prospects page to see full list and import new ones.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-ink">Active Campaigns</h2>
          <p className="text-sm text-slate-500">Go to Campaigns page to manage outreach.</p>
        </div>
      </div>
    </div>
  );
}

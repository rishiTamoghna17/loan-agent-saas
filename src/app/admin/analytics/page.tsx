import { createClient } from "@/lib/supabase/server";
import { ensureAdmin } from "@/app/admin/actions";
import { AdminCharts } from "@/components/admin/admin-charts";
import { 
  BarChart3, 
  Target, 
  Zap, 
  MousePointer2, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default async function AnalyticsPage() {
  await ensureAdmin();
  const supabase = createClient();

  // Fetch stats for rates
  const { count: totalSent } = await supabase.from("email_campaigns").select("*", { count: "exact", head: true });
  const { count: totalOpened } = await supabase.from("email_campaigns").select("*", { count: "exact", head: true }).not("opened_at", "is", null);
  const { count: totalClicked } = await supabase.from("email_campaigns").select("*", { count: "exact", head: true }).not("clicked_at", "is", null);
  const { count: totalReplied } = await supabase.from("email_campaigns").select("*", { count: "exact", head: true }).not("replied_at", "is", null);
  
  const { count: totalProspects } = await supabase.from("prospects").select("*", { count: "exact", head: true });
  const { count: totalTrials } = await supabase.from("prospects").select("*", { count: "exact", head: true }).eq("status", "trial_started");
  const { count: totalPaid } = await supabase.from("prospects").select("*", { count: "exact", head: true }).eq("status", "converted");

  const openRate = totalSent ? (totalOpened! / totalSent!) * 100 : 0;
  const clickRate = totalSent ? (totalClicked! / totalSent!) * 100 : 0;
  const replyRate = totalSent ? (totalReplied! / totalSent!) * 100 : 0;
  const trialRate = totalProspects ? (totalTrials! / totalProspects!) * 100 : 0;
  const paidRate = totalTrials ? (totalPaid! / totalTrials!) * 100 : 0;

  const metrics = [
    { label: "Open Rate", value: `${openRate.toFixed(1)}%`, icon: Zap, color: "text-yellow-600", trend: "+2.1%", positive: true },
    { label: "Click Rate", value: `${clickRate.toFixed(1)}%`, icon: MousePointer2, color: "text-blue-600", trend: "+0.5%", positive: true },
    { label: "Reply Rate", value: `${replyRate.toFixed(1)}%`, icon: Target, color: "text-pink-600", trend: "-0.2%", positive: false },
    { label: "Trial Conv. Rate", value: `${trialRate.toFixed(1)}%`, icon: TrendingUp, color: "text-indigo-600", trend: "+1.8%", positive: true },
    { label: "Paid Conv. Rate", value: `${paidRate.toFixed(1)}%`, icon: BarChart3, color: "text-emerald-600", trend: "+0.3%", positive: true },
  ];

  // Dummy chart data for the last 7 days
  const chartData = [
    { date: "Jun 03", opens: 12, clicks: 5, signups: 2, trials: 1 },
    { date: "Jun 04", opens: 18, clicks: 8, signups: 4, trials: 2 },
    { date: "Jun 05", opens: 15, clicks: 6, signups: 3, trials: 1 },
    { date: "Jun 06", opens: 25, clicks: 12, signups: 6, trials: 3 },
    { date: "Jun 07", opens: 32, clicks: 15, signups: 8, trials: 4 },
    { date: "Jun 08", opens: 28, clicks: 10, signups: 5, trials: 2 },
    { date: "Jun 09", opens: 35, clicks: 18, signups: 10, trials: 5 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Engagement Analytics</h1>
        <p className="text-slate-500">Analyze your outreach performance and conversion metrics.</p>
      </div>

      <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg bg-slate-50 p-2`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
              <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-2xl font-bold text-ink">{metric.value}</p>
              <div className={`flex items-center text-xs font-semibold ${metric.positive ? "text-emerald-600" : "text-rose-600"}`}>
                {metric.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {metric.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdminCharts data={chartData} />
    </div>
  );
}

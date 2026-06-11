import { getAdminSupabase } from "@/lib/admin-auth";
import { AdminCharts } from "@/components/admin/admin-charts";
import { 
  BarChart3, 
  Target, 
  Zap, 
  MousePointer2, 
  TrendingUp
} from "lucide-react";

export default async function AnalyticsPage() {
  const supabase = await getAdminSupabase();

  // Fetch stats for rates
  const { count: totalSent } = await supabase.from("email_campaigns").select("*", { count: "exact", head: true }).not("email_sent_at", "is", null);
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
    { label: "Open Rate", value: `${openRate.toFixed(1)}%`, icon: Zap, color: "text-yellow-600" },
    { label: "Click Rate", value: `${clickRate.toFixed(1)}%`, icon: MousePointer2, color: "text-blue-600" },
    { label: "Reply Rate", value: `${replyRate.toFixed(1)}%`, icon: Target, color: "text-pink-600" },
    { label: "Trial Conv. Rate", value: `${trialRate.toFixed(1)}%`, icon: TrendingUp, color: "text-indigo-600" },
    { label: "Paid Conv. Rate", value: `${paidRate.toFixed(1)}%`, icon: BarChart3, color: "text-emerald-600" },
  ];

  // First get all prospect IDs we've ever messaged
  const { data: allMessagedProspects } = await supabase
    .from("email_campaigns")
    .select("prospect_id, created_at")
    .order("created_at", { ascending: true });

  // Map to track first message date for each prospect
  const firstMessageDate: Record<string, string> = {};
  if (allMessagedProspects) {
    for (const campaign of allMessagedProspects) {
      if (!firstMessageDate[campaign.prospect_id]) {
        firstMessageDate[campaign.prospect_id] = campaign.created_at;
      }
    }
  }

  // Generate chart data for the last 7 days using real data
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const dateISO = date.toISOString().split('T')[0];
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateISO = nextDate.toISOString().split('T')[0];

    // Count opens for this date
    const { count: opensCount } = await supabase
      .from("email_campaigns")
      .select("*", { count: "exact", head: true })
      .gte("opened_at", dateISO)
      .lt("opened_at", nextDateISO);

    // Count clicks for this date
    const { count: clicksCount } = await supabase
      .from("email_campaigns")
      .select("*", { count: "exact", head: true })
      .gte("clicked_at", dateISO)
      .lt("clicked_at", nextDateISO);

    // Count prospects we first messaged this day
    let firstContactCount = 0;
    for (const dateStr in firstMessageDate) {
      const firstMsgDate = firstMessageDate[dateStr].split('T')[0];
      if (firstMsgDate === dateISO) {
        firstContactCount++;
      }
    }

    // Count trial starts for this date
    const { count: trialsCount } = await supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("status", "trial_started")
      .gte("updated_at", dateISO)
      .lt("updated_at", nextDateISO);

    chartData.push({
      date: dateStr,
      opens: opensCount || 0,
      clicks: clicksCount || 0,
      signups: firstContactCount,
      trials: trialsCount || 0
    });
  }

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
            <div className="mt-4">
              <p className="text-2xl font-bold text-ink">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>

      <AdminCharts data={chartData} />
    </div>
  );
}

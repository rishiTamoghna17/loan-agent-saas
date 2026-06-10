import { getAdminSupabase } from "@/lib/admin-auth";
import { getCampaignBaseUrl } from "@/lib/campaign-tracking";
import { 
  Users, 
  Mail, 
  MousePointer2, 
  MessageSquare, 
  Zap, 
  CheckCircle2,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Send,
  ShieldCheck
} from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await getAdminSupabase();
  const campaignBaseUrl = getCampaignBaseUrl();
  const webhookConfigured = Boolean(process.env.BREVO_WEBHOOK_SECRET);

  // Fetch recent prospects
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, name, company_name")
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch recent activity (opens/clicks/replies)
  const { data: recentActivityRaw } = await supabase
    .from("email_campaigns")
    .select("id, prospect_id, template_name, opened_at, clicked_at, replied_at, created_at, prospects(name)")
    .order("created_at", { ascending: false })
    .limit(20);

  // Transform recent activity
  const recentActivity = recentActivityRaw?.map((campaign: any) => {
    let type = null;
    let date = campaign.created_at;
    
    if (campaign.replied_at) {
      type = 'replied';
      date = campaign.replied_at;
    } else if (campaign.clicked_at) {
      type = 'clicked';
      date = campaign.clicked_at;
    } else if (campaign.opened_at) {
      type = 'opened';
      date = campaign.opened_at;
    }
    
    if (type) {
      // Handle case where prospects is an array (Supabase returns array for embedded relationships)
      const prospect = Array.isArray(campaign.prospects) ? campaign.prospects[0] : campaign.prospects;
      
      return {
        id: campaign.id,
        type,
        date,
        prospect_id: campaign.prospect_id,
        prospect_name: prospect?.name || 'Unknown Prospect',
        template_name: campaign.template_name || 'Unknown Template'
      };
    }
    return null;
  }).filter(Boolean) || [];

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

  const { count: emailsFailed } = await supabase
    .from("email_campaigns")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");

  const { count: emailsDelivered } = await supabase
    .from("email_campaigns")
    .select("*", { count: "exact", head: true })
    .not("delivered_at", "is", null);

  const { count: emailsBounced } = await supabase
    .from("email_campaigns")
    .select("*", { count: "exact", head: true })
    .in("status", ["bounced", "blocked", "spam"]);

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

  const { data: failedCampaigns } = await supabase
    .from("email_campaigns")
    .select("id, campaign_name, status, provider_error, created_at, prospects(name, email, company_name)")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "Total Prospects", value: totalProspects || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Emails Sent", value: emailsSent || 0, icon: Mail, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Delivered", value: emailsDelivered || 0, icon: Send, color: "text-cyan-600", bg: "bg-cyan-100" },
    { label: "Emails Opened", value: emailsOpened || 0, icon: Zap, color: "text-yellow-600", bg: "bg-yellow-100" },
    { label: "Links Clicked", value: linksClicked || 0, icon: MousePointer2, color: "text-indigo-600", bg: "bg-indigo-100" },
    { label: "Failed/Bounced", value: (emailsFailed || 0) + (emailsBounced || 0), icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-100" },
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

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <ShieldCheck className="h-4 w-4 text-brand-blue" />
            Campaign configuration
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-semibold text-ink">Campaign base URL</dt>
              <dd className="break-all text-slate-600">{campaignBaseUrl}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Brevo webhook URL</dt>
              <dd className="break-all text-slate-600">{campaignBaseUrl}/api/webhooks/brevo?secret=YOUR_SECRET</dd>
            </div>
          </dl>
        </div>
        <div className={`rounded-xl border p-5 shadow-sm ${webhookConfigured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className={`text-sm font-semibold ${webhookConfigured ? "text-emerald-800" : "text-amber-800"}`}>
            {webhookConfigured ? "Brevo webhook secret is configured." : "Brevo webhook secret is not configured."}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Add the webhook URL in Brevo Transactional webhooks and select delivered, opened, clicked, bounced, blocked, and spam events.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
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

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-ink">Recent Prospects</h2>
          {prospects && prospects.length > 0 ? (
            <div className="flex flex-col gap-3">
              {prospects.slice(0,5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.company_name}</p>
                  </div>
                  <a
                    href={`/admin/prospects/${p.id}`}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No recent prospects found.</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-ink">Recent Activity (Opens & Clicks)</h2>
          {recentActivity?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${activity.type === 'opened' ? 'bg-yellow-100 text-yellow-700' : activity.type === 'clicked' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {activity.type === 'opened' ? <Zap className="h-4 w-4" /> : activity.type === 'clicked' ? <MousePointer2 className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{activity.prospect_name}</p>
                      <p className="text-xs text-slate-500">{activity.template_name} • {new Date(activity.date).toLocaleString()}</p>
                    </div>
                  </div>
                  <a
                    href={`/admin/prospects/${activity.prospect_id}`}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    View Prospect
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No recent activity recorded.</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-ink">Recent Campaign Failures</h2>
          {failedCampaigns?.length ? (
            <div className="flex flex-col gap-3">
              {failedCampaigns.map((campaign: any) => {
                const prospect = Array.isArray(campaign.prospects) ? campaign.prospects[0] : campaign.prospects;
                return (
                  <div key={campaign.id} className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm">
                    <p className="font-semibold text-ink">{prospect?.name || prospect?.company_name || "Prospect"}</p>
                    <p className="text-xs text-slate-600">{prospect?.email}</p>
                    <p className="mt-2 text-xs text-rose-700">
                      {campaign.provider_error?.message || campaign.provider_error?.error || "Brevo request failed"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No failed campaign sends recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}

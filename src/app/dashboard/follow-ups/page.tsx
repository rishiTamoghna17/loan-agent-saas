import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar";
import { DesktopTopBar } from "@/components/dashboard/DesktopTopBar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { classifyFollowUp } from "@/lib/follow-ups";
import { getLeadFolders } from "@/app/dashboard/actions";

export default async function FollowUpsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent } = await supabase.from("agents").select("*").eq("user_id", user.id).single();
  if (!agent) redirect("/signup");

  const filterValues = Object.fromEntries(Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? "" : value ?? ""])) as Record<string, string>;
  const folderId = typeof filterValues.folder === "string" ? filterValues.folder : undefined;

  const [leadResult, eventResult, followUpResult, preferenceResult, folders, campaignResult, whatsappCampaignResult] = await Promise.all([
    supabase
      .from("leads")
      .select("*, lead_notes(id, note, created_at), lead_follow_ups(id,due_at,note,status,completed_at,completion_source,created_at)")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false }),
    supabase.from("agent_events").select("event_type").eq("agent_id", agent.id),
    supabase.from("lead_follow_ups").select("*, leads!inner(name,phone,loan_type)").eq("agent_id", agent.id).order("due_at"),
    supabase.from("agent_notification_preferences").select("*").eq("agent_id", agent.id).maybeSingle(),
    getLeadFolders(),
    supabase.from("email_campaigns").select("*").eq("agent_id", agent.id).order("created_at", { ascending: false }),
    supabase.from("whatsapp_campaigns").select("*").eq("agent_id", agent.id).order("created_at", { ascending: false })
  ]);
  const leadRows = leadResult.data;
  const emailCampaigns = campaignResult.data ?? [];
  const whatsappCampaigns = whatsappCampaignResult.data ?? [];
  const events = eventResult.data ?? [];
  const leads = leadRows ?? [];
  const timezone = preferenceResult.data?.timezone ?? "Asia/Kolkata";
  const activeFollowUps = (followUpResult.data ?? []).filter((item) => item.status === "pending");

  const now = new Date();
  const trialEndsAt = new Date(agent.trial_ends_at ?? now.toISOString());
  const trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000));
  const isTrialExpired = agent.plan_status === "expired" || (agent.plan_status === "trial" && trialDaysRemaining <= 0);
  const followUpGroups = {
    overdue: activeFollowUps.filter((item) => classifyFollowUp(item.due_at, timezone, now) === "overdue"),
    today: activeFollowUps.filter((item) => classifyFollowUp(item.due_at, timezone, now) === "today"),
    upcoming: activeFollowUps.filter((item) => classifyFollowUp(item.due_at, timezone, now) === "upcoming")
  };

  const counts = {
    total: leads.length,
    new: leads.filter((lead) => lead.status === "new").length,
    follow_up: leads.filter((lead) => lead.status === "follow_up").length,
    closed: leads.filter((lead) => lead.status === "closed").length,
    rejected: leads.filter((lead) => lead.status === "rejected").length
  };
  const analytics = {
    visits: events.filter((event) => event.event_type === "website_visit").length,
    submissions: events.filter((event) => event.event_type === "lead_submission").length,
    whatsappClicks: events.filter((event) => event.event_type === "whatsapp_click").length,
    conversion: events.filter((event) => event.event_type === "website_visit").length
      ? Math.round((events.filter((event) => event.event_type === "lead_submission").length / events.filter((event) => event.event_type === "website_visit").length) * 100)
      : 0
  };
  const pageSize = [10, 20, 50, 100].includes(Number(filterValues.pageSize)) ? Number(filterValues.pageSize) : 20;
  const requestedPage = Math.max(1, Number(filterValues.page) || 1);
  const filteredLeads = leads.filter((lead) => {
    const q = filterValues.q?.toLowerCase();
    const pending = Array.isArray(lead.lead_follow_ups) ? lead.lead_follow_ups.find((item: { status: string }) => item.status === "pending") : null;
    const view = filterValues.view || "active";
    if (view === "active" && (lead.archived_at || lead.deleted_at)) return false;
    if (view === "archived" && (!lead.archived_at || lead.deleted_at)) return false;
    if (view === "deleted" && !lead.deleted_at) return false;
    if (q && !lead.name.toLowerCase().includes(q) && !lead.phone.toLowerCase().includes(q)) return false;
    if (filterValues.status && lead.status !== filterValues.status) return false;
    if (filterValues.source && lead.source !== filterValues.source) return false;
    if (filterValues.loanType && lead.loan_type !== filterValues.loanType) return false;
    if (filterValues.from && lead.created_at < `${filterValues.from}T00:00:00`) return false;
    if (filterValues.to && lead.created_at > `${filterValues.from}T23:59:59`) return false;
    if (filterValues.followUp === "none" && pending) return false;
    if (filterValues.followUp && filterValues.followUp !== "none" && (!pending || classifyFollowUp(pending.due_at, timezone, now) !== filterValues.followUp)) return false;
    return true;
  }).sort((a, b) => {
    const aFollowUp = a.lead_follow_ups?.find((item: { status: string }) => item.status === "pending")?.due_at ?? "9999";
    const bFollowUp = b.lead_follow_ups?.find((item: { status: string }) => item.status === "pending")?.due_at ?? "9999";
    if (filterValues.sort === "created_asc") return a.created_at.localeCompare(b.created_at);
    if (filterValues.sort === "amount_desc") return Number(b.required_amount) - Number(a.required_amount);
    if (filterValues.sort === "amount_asc") return Number(a.required_amount) - Number(b.required_amount);
    if (filterValues.sort === "name_asc") return a.name.localeCompare(b.name);
    if (filterValues.sort === "status_asc") return a.status.localeCompare(b.status);
    if (filterValues.sort === "follow_up_asc") return aFollowUp.localeCompare(bFollowUp);
    return b.created_at.localeCompare(a.created_at);
  });
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const filteredLeadsWithFolder = filteredLeads.filter((lead) => {
    if (folderId === "unfiled") return !lead.folder_id;
    else if (folderId && uuidRegex.test(folderId)) return lead.folder_id === folderId;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredLeadsWithFolder.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const visibleLeads = filteredLeadsWithFolder.slice((page - 1) * pageSize, page * pageSize);
  const exportParams = new URLSearchParams(filterValues);
  exportParams.delete("page");
  exportParams.delete("pageSize");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DesktopSidebar 
        agent={agent} 
        trialDaysRemaining={trialDaysRemaining} 
        isTrialExpired={isTrialExpired} 
        folders={folders}
        folderId={folderId}
      />
      
      <div className="flex flex-1 flex-col">
        <DesktopTopBar title="Follow-ups" agentSlug={agent.slug} />
        
        {/* Desktop main content */}
        <div className="hidden lg:block flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Follow-ups</h1>
              <p className="text-slate-600">Manage reminders and upcoming lead activities</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-800">Overdue</span>
                </div>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-red-900">{followUpGroups.overdue.length}</p>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-800">Due today</span>
                </div>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-amber-900">{followUpGroups.today.length}</p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Upcoming</span>
                </div>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-blue-900">{followUpGroups.upcoming.length}</p>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">Completed</span>
                </div>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-green-900">{(followUpResult.data ?? []).filter((item) => item.status === "completed").length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <p className="text-slate-500">Follow-ups workspace coming soon</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile/Tablet existing interface (reuse DashboardContent) */}
        <div className="lg:hidden">
          <DashboardContent
            agent={agent}
            trialDaysRemaining={trialDaysRemaining}
            isTrialExpired={isTrialExpired}
            counts={counts}
            analytics={analytics}
            activeFollowUps={activeFollowUps}
            followUpGroups={followUpGroups}
            folders={folders}
            folderId={folderId}
            filteredLeads={filteredLeadsWithFolder}
            visibleLeads={visibleLeads}
            page={page}
            pageSize={pageSize}
            query={filterValues}
            exportParams={exportParams}
            timezone={timezone}
            mode="follow-ups"
            emailCampaigns={emailCampaigns}
            whatsappCampaigns={whatsappCampaigns}
          />
        </div>
      </div>
    </div>
  );
}
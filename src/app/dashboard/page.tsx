import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BellRing,
  Building2,
  Download,
  Folder,
  Globe2,
  MapPin,
  Mail,
  Phone,
  UserRound,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Users,
  FileText,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { ContactLeadButton } from "@/components/dashboard/contact-lead-button";
import { AddLeadsMenu } from "@/components/dashboard/add-leads-menu";
import { LeadActionsPanel } from "@/components/dashboard/lead-actions-panel";
import { LeadFilters } from "@/components/dashboard/lead-filters";
import { LeadPagination } from "@/components/dashboard/lead-pagination";
import { LeadStatusSelect } from "@/components/dashboard/lead-status-select";
import { LeadFolderBrowser } from "@/components/agent/lead-folder-browser";
import { LeadFolderMoveTable } from "@/components/agent/lead-folder-move-table";
import { LeadImport } from "@/components/agent/lead-import";
import { getLeadFolders } from "@/app/dashboard/actions";
import { SUPPORT_CONTACT } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { classifyFollowUp, formatFollowUpDate } from "@/lib/follow-ups";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getFolderName(folders: Array<{ id: string; name: string }>, folderId?: string | null): string | null {
  if (!folderId) return null;
  const folder = folders.find(f => f.id === folderId);
  return folder ? folder.name : null;
}

function getStatusVariant(status: string) {
  switch (status) {
    case "new": return "default";
    case "contacted": return "primary";
    case "follow_up": return "warning";
    case "closed": return "success";
    case "rejected": return "danger";
    default: return "default";
  }
}

function getFollowUpVariant(group: string) {
  switch (group) {
    case "overdue": return "danger";
    case "today": return "warning";
    case "upcoming": return "default";
    default: return "default";
  }
}

export default async function DashboardPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent } = await supabase.from("agents").select("*").eq("user_id", user.id).single();
  if (!agent) redirect("/signup");

  const filterValues = Object.fromEntries(Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? "" : value ?? ""])) as Record<string, string>;
  const folderId = typeof filterValues.folder === "string" ? filterValues.folder : undefined;
  const [leadResult, eventResult, followUpResult, preferenceResult, folders] = await Promise.all([
    supabase
      .from("leads")
      .select("*, lead_notes(id, note, created_at), lead_follow_ups(id,due_at,note,status,completed_at,completion_source,created_at)")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false }),
    supabase.from("agent_events").select("event_type").eq("agent_id", agent.id),
    supabase.from("lead_follow_ups").select("*, leads!inner(name,phone,loan_type)").eq("agent_id", agent.id).order("due_at"),
    supabase.from("agent_notification_preferences").select("*").eq("agent_id", agent.id).maybeSingle(),
    getLeadFolders()
  ]);
  const leadRows = leadResult.data;
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

  // Apply folder filter
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
    <div className="min-h-screen bg-slate-50">
      {/* Top Banner */}
      {agent.plan_status === "trial" && !isTrialExpired ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-amber-900">
              <BellRing className="h-4 w-4" />
              <span className="font-medium">Trial Expiring Soon</span>
              <span className="text-amber-800">{trialDaysRemaining} days remaining in your free trial</span>
            </div>
          </div>
        </div>
      ) : null}
      {isTrialExpired ? (
        <div className="border-b border-red-200 bg-red-50">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Trial Expired</span>
              <span className="text-red-800">You can only view your leads. Contact support to continue.</span>
              <a href={`tel:${SUPPORT_CONTACT.phone}`} className="ml-2 font-semibold underline underline-offset-4 text-red-900">
                Call now
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {agent.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.logo_url} alt={agent.business_name} className="h-12 w-12 rounded-2xl border border-slate-200 object-cover shadow-sm" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-bold text-white shadow-sm">
                {agent.agent_name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-600">Welcome back</p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900 truncate">{agent.business_name}</h1>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3 w-3" />
                  {agent.agent_name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {agent.city}, {agent.district}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Link href="/dashboard/profile">
              <Button variant="outline" className="flex items-center gap-1.5">
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
            <Link href={`/agent/${agent.slug}`}>
              <Button className="flex items-center gap-1.5">
                <Globe2 className="h-4 w-4" />
                <span className="hidden sm:inline">Public page</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid - 1 col on mobile, 2 on tablet, 5 on desktop */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total leads</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{counts.total}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">New leads</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{counts.new}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Plus className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Follow-ups</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{counts.follow_up}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <BellRing className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Closed</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{counts.closed}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Conversion</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{analytics.conversion}%</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Follow-ups Section - Stack on mobile, grid on tablet+ */}
        {activeFollowUps.length ? (
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-amber-600" />
                <CardTitle>Follow-up tasks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {(["overdue", "today", "upcoming"] as const).map((group) => (
                  <div key={group} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold capitalize text-slate-900">{group}</p>
                      <Badge variant={getFollowUpVariant(group)}>{followUpGroups[group].length}</Badge>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {followUpGroups[group].slice(0, 3).map((task) => {
                        const lead = Array.isArray(task.leads) ? task.leads[0] : task.leads;
                        return (
                          <div key={task.id} className="flex items-center gap-2 text-xs text-slate-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span className="font-medium truncate">{lead?.name}</span>
                            <span className="text-slate-400">·</span>
                            <span className="whitespace-nowrap">{formatFollowUpDate(task.due_at, timezone)}</span>
                          </div>
                        );
                      })}
                      {followUpGroups[group].length > 3 ? (
                        <p className="text-xs text-slate-400">+{followUpGroups[group].length - 3} more</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Main Content - Sidebar first on mobile, grid on desktop */}
        <div className="mt-8 space-y-6 lg:grid lg:gap-8 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <LeadFolderBrowser folders={folders} activeFolderId={folderId} />
            <LeadImport folderId={folderId} />
          </div>

          {/* Leads Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-slate-500" />
                    Leads
                  </CardTitle>
                  {folderId ? (
                    <CardDescription>
                      Showing folder: <span className="font-semibold text-slate-700">{folderId === "unfiled" ? "Unfiled" : folders.find(f => f.id === folderId)?.name}</span>
                    </CardDescription>
                  ) : <CardDescription>Manage and track your leads</CardDescription>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <AddLeadsMenu disabled={isTrialExpired} />
                  <a href={`/api/leads/export?${exportParams.toString()}`}>
                    <Button variant="outline" className="flex items-center gap-1.5">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <LeadFilters values={filterValues} />
                <LeadFolderMoveTable folders={folders} disabled={isTrialExpired} />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-10 px-4 py-3"><span className="sr-only">Select</span></th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Loan type</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Folder</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <input type="checkbox" name="lead_ids" value={lead.id} form="move-leads-form" aria-label={`Select ${lead.name}`} disabled={isTrialExpired} className="rounded border-slate-300" />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 text-sm">{lead.name}</p>
                            {lead.email ? <p className="text-xs text-slate-500 truncate max-w-[150px]">{lead.email}</p> : null}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-sm">{lead.phone}</td>
                          <td className="px-4 py-3 text-slate-600 text-sm">{lead.loan_type}</td>
                          <td className="px-4 py-3 font-medium text-slate-900 text-sm">{formatCurrency(lead.required_amount)}</td>
                          <td className="px-4 py-3">
                            {isTrialExpired ? (
                              <span className="text-sm text-slate-500">Locked</span>
                            ) : (
                              <LeadStatusSelect leadId={lead.id} status={lead.status} />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lead.folder_id ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                                <Folder className="h-3 w-3" />
                                {getFolderName(folders, lead.folder_id)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <ContactLeadButton agentId={agent.id} leadName={lead.name} phone={lead.phone} />
                              <LeadActionsPanel
                                leadId={lead.id}
                                agentId={agent.id}
                                leadName={lead.name}
                                timezone={timezone}
                                notes={lead.lead_notes ?? []}
                                followUps={lead.lead_follow_ups ?? []}
                                disabled={isTrialExpired}
                                lifecycle={lead.deleted_at ? "deleted" : lead.archived_at ? "archived" : "active"}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!visibleLeads.length ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="h-10 w-10 text-slate-300" />
                              <p className="text-sm text-slate-500">No leads yet. Share your public page to start receiving enquiries.</p>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="px-4 py-3 sm:px-6">
                <LeadPagination page={page} pageSize={pageSize} count={filteredLeadsWithFolder.length} query={filterValues} />
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

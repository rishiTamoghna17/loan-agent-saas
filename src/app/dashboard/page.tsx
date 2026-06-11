import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, BellRing, Building2, Download, Globe2, MapPin, Mail, Phone, Trash2, UserRound } from "lucide-react";
import { addLeadNote, deleteLead } from "./actions";
import { ContactLeadButton } from "@/components/dashboard/contact-lead-button";
import { FollowUpControls } from "@/components/dashboard/follow-up-controls";
import { LeadFilters } from "@/components/dashboard/lead-filters";
import { LeadPagination } from "@/components/dashboard/lead-pagination";
import { LeadStatusSelect } from "@/components/dashboard/lead-status-select";
import { PendingButton } from "@/components/ui/pending-button";
import { SUPPORT_CONTACT } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { classifyFollowUp, formatFollowUpDate } from "@/lib/follow-ups";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent } = await supabase.from("agents").select("*").eq("user_id", user.id).single();
  if (!agent) redirect("/signup");

  const [leadResult, eventResult, followUpResult, preferenceResult] = await Promise.all([
    supabase
      .from("leads")
      .select("*, lead_notes(id, note, created_at), lead_follow_ups(id,due_at,note,status,completed_at,created_at)")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false }),
    supabase.from("agent_events").select("event_type").eq("agent_id", agent.id),
    supabase.from("lead_follow_ups").select("*, leads!inner(name,phone,loan_type)").eq("agent_id", agent.id).order("due_at"),
    supabase.from("agent_notification_preferences").select("*").eq("agent_id", agent.id).maybeSingle()
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
  const filterValues = Object.fromEntries(Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? "" : value ?? ""])) as Record<string, string>;
  const pageSize = [10, 20, 50, 100].includes(Number(filterValues.pageSize)) ? Number(filterValues.pageSize) : 20;
  const requestedPage = Math.max(1, Number(filterValues.page) || 1);
  const filteredLeads = leads.filter((lead) => {
    const q = filterValues.q?.toLowerCase();
    const pending = Array.isArray(lead.lead_follow_ups) ? lead.lead_follow_ups.find((item: { status: string }) => item.status === "pending") : null;
    if (q && !lead.name.toLowerCase().includes(q) && !lead.phone.toLowerCase().includes(q)) return false;
    if (filterValues.status && lead.status !== filterValues.status) return false;
    if (filterValues.source && lead.source !== filterValues.source) return false;
    if (filterValues.loanType && lead.loan_type !== filterValues.loanType) return false;
    if (filterValues.from && lead.created_at < `${filterValues.from}T00:00:00`) return false;
    if (filterValues.to && lead.created_at > `${filterValues.to}T23:59:59`) return false;
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
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const visibleLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize);
  const exportParams = new URLSearchParams(filterValues);
  exportParams.delete("page");
  exportParams.delete("pageSize");

  return (
    <div className="mx-auto max-w-7xl px-5 py-6">
      {agent.plan_status === "trial" && !isTrialExpired ? (
        <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-800">
          {trialDaysRemaining} days remaining in your free trial.
        </div>
      ) : null}
      {isTrialExpired ? (
        <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-5 text-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Your trial has ended.</p>
              <p className="mt-2 text-sm">You can only view your leads. To continue accessing all features, contact our support team:</p>
              <div className="mt-3 space-y-1">
                <a href={`tel:${SUPPORT_CONTACT.phone}`} className="flex items-center gap-2 text-sm hover:underline">
                  <Phone className="h-4 w-4" />
                  {SUPPORT_CONTACT.phone}
                </a>
                <a href={`mailto:${SUPPORT_CONTACT.email}`} className="flex items-center gap-2 text-sm hover:underline">
                  <Mail className="h-4 w-4" />
                  {SUPPORT_CONTACT.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {agent.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.logo_url} alt={agent.business_name} className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-xl font-bold text-white">
                {agent.agent_name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-blue">Lead dashboard</p>
              <h1 className="mt-1 text-3xl font-bold text-ink">{agent.business_name}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  {agent.agent_name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {agent.city}, {agent.district}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  /agent/{agent.slug}
                </span>
                {agent.custom_domain ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe2 className="h-4 w-4 text-slate-400" />
                    {agent.custom_domain} · {agent.domain_status?.replace("_", " ")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard/profile" className="btn-secondary">Edit profile</Link>
            <Link href={`/agent/${agent.slug}`} className="btn-primary">View public page</Link>
          </div>
        </div>
      </section>

      {activeFollowUps.length ? (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <BellRing className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-semibold text-amber-950">Follow-up tasks</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {(["overdue", "today", "upcoming"] as const).map((group) => (
                  <div key={group} className="rounded-md border border-amber-200 bg-white p-3 text-sm">
                    <p className="font-semibold capitalize text-ink">{group} · {followUpGroups[group].length}</p>
                    {followUpGroups[group].slice(0, 3).map((task) => {
                      const lead = Array.isArray(task.leads) ? task.leads[0] : task.leads;
                      return <p key={task.id} className="mt-2 text-xs text-slate-600">{lead?.name} · {formatFollowUpDate(task.due_at, timezone)}</p>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Total leads" value={counts.total} />
        <Metric label="New leads" value={counts.new} />
        <Metric label="Follow-up" value={counts.follow_up} />
        <Metric label="Closed" value={counts.closed} />
        <Metric label="Rejected" value={counts.rejected} />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Website visits" value={analytics.visits} />
        <Metric label="Lead submissions" value={analytics.submissions} />
        <Metric label="WhatsApp clicks" value={analytics.whatsappClicks} />
        <Metric label="Conversion %" value={analytics.conversion} suffix="%" />
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-ink">Leads</h2>
          <a href={`/api/leads/export?${exportParams.toString()}`} className="btn-secondary">
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </div>
        <LeadFilters values={filterValues} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Loan type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLeads.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{lead.name}</p>
                    {lead.email ? <p className="text-xs text-slate-500">{lead.email}</p> : null}
                    {lead.message ? <p className="mt-2 max-w-xs text-xs text-slate-500">{lead.message}</p> : null}
                  </td>
                  <td className="px-4 py-4">{lead.phone}</td>
                  <td className="px-4 py-4">{lead.loan_type}</td>
                  <td className="px-4 py-4">{formatCurrency(lead.required_amount)}</td>
                  <td className="px-4 py-4">
                    <p>{lead.city}</p>
                    {lead.district || lead.state || lead.pincode ? (
                      <p className="text-xs text-slate-500">
                        {[lead.district, lead.state].filter(Boolean).join(", ")}
                        {lead.pincode ? ` - ${lead.pincode}` : ""}
                      </p>
                    ) : null}
                    {lead.landmark ? <p className="mt-1 text-xs text-slate-500">Landmark: {lead.landmark}</p> : null}
                  </td>
                  <td className="px-4 py-4">{lead.source ?? "Website"}</td>
                  <td className="px-4 py-4">
                    {isTrialExpired ? <span className="text-sm text-slate-500">Locked</span> : <LeadStatusSelect leadId={lead.id} status={lead.status} />}
                  </td>
                  <td className="px-4 py-4">{formatDate(lead.created_at)}</td>
                  <td className="space-y-2 px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <ContactLeadButton agentId={agent.id} leadName={lead.name} phone={lead.phone} />
                      <form action={deleteLead}>
                        <input type="hidden" name="lead_id" value={lead.id} />
                        <PendingButton className="btn-secondary text-red-600" pendingText="Deleting..." disabled={isTrialExpired}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </PendingButton>
                      </form>
                    </div>
                    <form action={addLeadNote} className="flex gap-2">
                      <input type="hidden" name="lead_id" value={lead.id} />
                      <input type="hidden" name="agent_id" value={agent.id} />
                      <input name="note" className="field min-w-56" placeholder="Add note" disabled={isTrialExpired} />
                      <PendingButton className="btn-secondary" pendingText="Adding..." disabled={isTrialExpired}>Add</PendingButton>
                    </form>
                    <FollowUpControls leadId={lead.id} timezone={timezone} followUps={lead.lead_follow_ups ?? []} disabled={isTrialExpired} />
                    {"lead_notes" in lead && Array.isArray(lead.lead_notes) && lead.lead_notes.length ? (
                      <div className="space-y-1 rounded-md bg-slate-50 p-2">
                        {lead.lead_notes.slice(0, 4).map((note: { id: string; note: string; created_at?: string }) => (
                          <p key={note.id} className="text-xs text-slate-600">
                            {note.note}
                            {note.created_at ? <span className="block text-[11px] text-slate-400">{formatDate(note.created_at)}</span> : null}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!visibleLeads.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    No leads yet. Share your public page to start receiving enquiries.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <LeadPagination page={page} pageSize={pageSize} count={filteredLeads.length} query={filterValues} />
      </section>
    </div>
  );
}

function Metric({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}{suffix}</p>
    </div>
  );
}

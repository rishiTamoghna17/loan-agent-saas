import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, BellRing, Building2, Globe2, MapPin, Mail, Phone, Trash2, UserRound } from "lucide-react";
import { addLeadNote, deleteLead } from "./actions";
import { ContactLeadButton } from "@/components/dashboard/contact-lead-button";
import { LeadStatusSelect } from "@/components/dashboard/lead-status-select";
import { PendingButton } from "@/components/ui/pending-button";
import { SUPPORT_CONTACT } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent } = await supabase.from("agents").select("*").eq("user_id", user.id).single();
  if (!agent) redirect("/signup");

  const [leadResult, eventResult] = await Promise.all([
    supabase
      .from("leads")
      .select("*, lead_notes(id, note, created_at)")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false }),
    supabase.from("agent_events").select("event_type").eq("agent_id", agent.id)
  ]);
  const leadRows = leadResult.data;
  const events = eventResult.data ?? [];
  const leads = leadRows ?? [];

  const now = new Date();
  const trialEndsAt = new Date(agent.trial_ends_at ?? now.toISOString());
  const trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000));
  const isTrialExpired = agent.plan_status === "expired" || (agent.plan_status === "trial" && trialDaysRemaining <= 0);
  const staleLeadCutoff = now.getTime() - 2 * 86_400_000;
  const followUpReminders = leads.filter(
    (lead) => ["new", "follow_up"].includes(lead.status) && new Date(lead.updated_at).getTime() < staleLeadCutoff
  );

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

      {followUpReminders.length ? (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <BellRing className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-semibold text-amber-950">Follow-up pending</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {followUpReminders.slice(0, 4).map((lead) => (
                  <div key={lead.id} className="rounded-md border border-amber-200 bg-white p-3 text-sm">
                    <p className="font-semibold text-ink">{lead.name}</p>
                    <p className="text-slate-600">{lead.loan_type} · Updated {formatDate(lead.updated_at)}</p>
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
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-ink">Leads</h2>
        </div>
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
              {leads.map((lead) => (
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
              {!leads.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    No leads yet. Share your public page to start receiving enquiries.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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

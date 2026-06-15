"use client";

import { useState, useEffect } from "react";
import {
  useAgentDashboard,
  PersonaType,
  CampaignData,
  LeadData,
  LiveFeedEvent
} from "@/lib/hooks/useAgentDashboard";
import {
  Users,
  Mail,
  MessageSquare,
  Award,
  ArrowUpRight,
  Phone,
  Clock,
  Sparkles,
  HelpCircle,
  Check,
  Send,
  ExternalLink,
  Activity,
  AlertCircle,
  Briefcase,
  Store,
  ChevronRight,
  Loader2,
  X,
  Paperclip
} from "lucide-react";
import { getSecureDownloadUrls } from "@/app/dashboard/actions";

interface AgentDashboardProps {
  agentId: string;
}

export function AgentDashboard({ agentId }: AgentDashboardProps) {
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>("loans");
  const {
    persona,
    setPersona,
    loading,
    metrics,
    campaigns,
    leads,
    liveFeed,
    simulateNewWebhookEvent
  } = useAgentDashboard(agentId, selectedPersona);

  const [activeFollowUpLead, setActiveFollowUpLead] = useState<LeadData | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handlePersonaChange = (type: PersonaType) => {
    setSelectedPersona(type);
    setPersona(type);
  };

  const triggerToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  const handleFollowUpAction = (leadName: string) => {
    // Find the lead object by name (or generate a mock one if from webhook pool)
    const foundLead = leads.find(l => l.name === leadName) || {
      id: "sim-lead",
      name: leadName,
      email: `${leadName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      phone: "+91 99999 88888",
      status: "new" as const,
      lastContacted: "Just now",
      details: persona === "loans" ? "Home Loan enquiry" : persona === "retail" ? "Product catalog enquiry" : "Marketing contract pitch"
    };
    setActiveFollowUpLead(foundLead);
  };

  const [activeDropdownLeadId, setActiveDropdownLeadId] = useState<string | null>(null);
  const [downloadingDocPath, setDownloadingDocPath] = useState<string | null>(null);

  const handleDownloadSingleDocument = async (docPath: string) => {
    setDownloadingDocPath(docPath);
    try {
      const res = await getSecureDownloadUrls([docPath]);
      if (res.success && res.urls && res.urls[0]) {
        window.open(res.urls[0], "_blank");
        triggerToast("Secure download URL generated!");
      } else {
        alert(res.error || "Failed to generate signed download URL.");
      }
    } catch (err: any) {
      console.error("Error fetching signed URL:", err);
      alert("An error occurred while fetching secure download URL: " + err.message);
    } finally {
      setDownloadingDocPath(null);
    }
  };

  useEffect(() => {
    if (!activeDropdownLeadId) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown="true"]')) {
        setActiveDropdownLeadId(null);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [activeDropdownLeadId]);

  return (
    <div className="relative min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-xl animate-bounce">
          <Check className="h-4 w-4 text-brand-green" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Desk */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-brand-blue ring-1 ring-inset ring-blue-700/10">
              Agent Portal
            </span>
            <span className="text-xs text-slate-500 font-mono">Agent ID: {agentId}</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">My Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">Track your personal leads, outreach, and engagement logs in real time.</p>
        </div>

        {/* Business Persona Toggle */}
        {/* <div className="flex flex-col gap-1.5"> */}
        {/* <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" /> Workspace Profile
          </label> */}
        {/* <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200"> */}
        {/* <button 
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Loans
            </button> */}

        {/* Comment out Retail and Marketing buttons for now
            <button 
              type="button"
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed"
            >
              Retail
            </button>
            
            <button 
              type="button"
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed"
            >
              Marketing
            </button>
            */}
        {/* </div> */}
        {/* </div> */}
      </div>

      {loading ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          <p className="text-sm font-medium text-slate-500">Syncing agent logs...</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in-50 duration-300">

          {/* Top Action Desk (Metrics Cards Grid) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, idx) => {
              // Map icons to metrics
              let Icon = Users;
              let bgIconColor = "bg-blue-50 text-brand-blue";
              if (metric.label.includes("Campaigns")) {
                Icon = Mail;
                bgIconColor = "bg-purple-50 text-purple-600";
              } else if (metric.label.includes("Engagement")) {
                Icon = MessageSquare;
                bgIconColor = "bg-amber-50 text-amber-600";
              } else if (metric.label.includes("Conversions")) {
                Icon = Award;
                bgIconColor = "bg-emerald-50 text-brand-green";
              }

              return (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-1">
                        {metric.label}
                        <span className="inline-block" title={metric.tooltip}>
                          <HelpCircle className="h-3.5 w-3.5 text-slate-300 hover:text-slate-500 cursor-pointer" />
                        </span>
                      </p>
                      <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{metric.value}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${bgIconColor} transition-transform group-hover:scale-110`}>
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs">
                    <span className={`font-semibold ${metric.isPositive ? "text-brand-green" : "text-rose-600"}`}>
                      {metric.change.split(" ")[0]}
                    </span>
                    <span className="text-slate-500">
                      {metric.change.split(" ").slice(1).join(" ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Layout Split */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-10 items-start">

            {/* LEFT PANEL (70% on large screens) */}
            <div className="space-y-8 lg:col-span-7 min-w-0">

              {/* Campaigns Table */}
              <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200/80 px-6 py-5 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">My Recent Campaigns</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Campaigns dispatched under your agent account profile.</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Showing last 4</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/60">
                      <tr>
                        <th className="px-6 py-3.5">Campaign Name</th>
                        <th className="px-6 py-3.5">Channel</th>
                        <th className="px-6 py-3.5 text-right">Audience</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Engagement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900 block truncate max-w-[240px]" title={campaign.name}>
                              {campaign.name}
                            </span>
                            <span className="text-xs text-slate-400 block mt-0.5">{campaign.sentAt}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${campaign.channel === "email"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-emerald-50 text-emerald-700"
                              }`}>
                              {campaign.channel === "email" ? (
                                <>
                                  <Mail className="h-3 w-3" /> Email
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="h-3 w-3" /> WhatsApp
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-700 tabular-nums">
                            {campaign.audienceSize.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${campaign.status === "sent"
                              ? "bg-emerald-50 text-emerald-700"
                              : campaign.status === "sending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                              }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${campaign.status === "sent"
                                ? "bg-emerald-500"
                                : campaign.status === "sending"
                                  ? "bg-amber-500 animate-pulse"
                                  : "bg-rose-500"
                                }`} />
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs font-bold text-slate-950">
                                {campaign.channel === "email" ? `Open: ${campaign.openRate}%` : `Read: ${campaign.openRate}%`}
                              </span>
                              <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-brand-blue h-1.5 rounded-full"
                                  style={{ width: `${campaign.openRate}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500">
                                Click: {campaign.clickRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Pipeline Leads */}
              <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200/80 px-6 py-5 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">My Active Pipeline</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Leads assigned to you currently requiring response or actions.</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                    {leads.length} Active
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 gap-4 hover:bg-slate-50/30 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-slate-900">{lead.name}</h3>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${lead.status === "new"
                            ? "bg-sky-50 text-sky-700 ring-sky-700/10"
                            : lead.status === "in_progress"
                              ? "bg-amber-50 text-amber-700 ring-amber-700/10"
                              : "bg-emerald-50 text-emerald-700 ring-emerald-700/10"
                            }`}>
                            {lead.status === "new" ? "New" : lead.status === "in_progress" ? "In Progress" : "Converted"}
                          </span>
                          {lead.documents && lead.documents.length > 0 && (
                            <div className="relative inline-block" data-dropdown="true">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownLeadId(activeDropdownLeadId === lead.id ? null : lead.id);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 px-2.5 py-0.5 text-xs font-semibold text-slate-600 transition-all shadow-sm"
                                title="Click to view documents"
                              >
                                <Paperclip className="h-3 w-3 text-slate-500" />
                                <span>{lead.documents.length} {lead.documents.length === 1 ? "File" : "Files"}</span>
                              </button>

                              {activeDropdownLeadId === lead.id && (
                                <div className="absolute left-0 mt-2 w-72 rounded-xl bg-white p-3 shadow-xl border border-slate-200 z-40 text-left animate-in fade-in-50 slide-in-from-top-1 duration-150">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Attached Documents</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveDropdownLeadId(null);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {lead.documents.map((doc) => {
                                      const fileName = doc.split("/").pop() || doc;
                                      const isDownloading = downloadingDocPath === doc;
                                      return (
                                        <div key={doc} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100/80 hover:bg-slate-100/80 transition-colors">
                                          <span className="text-xs font-medium text-slate-700 truncate max-w-[160px]" title={fileName}>
                                            {fileName}
                                          </span>
                                          <button
                                            type="button"
                                            disabled={downloadingDocPath !== null}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadSingleDocument(doc);
                                            }}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {isDownloading ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <>
                                                Download <ArrowUpRight className="h-3 w-3" />
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {lead.details}
                          </span>
                          <span>·</span>
                          <span>{lead.email}</span>
                          <span>·</span>
                          <span>{lead.phone}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Last Action</p>
                          <p className="text-sm font-semibold text-slate-700 flex items-center justify-end gap-1 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {lead.lastContacted}
                          </p>
                        </div>

                        <button
                          onClick={() => setActiveFollowUpLead(lead)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                        >
                          Interact
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT PANEL - Live Engagement Feed ("Hot List" timeline) (3% of columns) */}
            <div className="space-y-4 lg:col-span-3 lg:sticky lg:top-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                {/* Header feed */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-blue"></span>
                    </div>
                    <h3 className="font-extrabold text-slate-950 text-base">Live Activity</h3>
                  </div>

                  {/* Simulate Webhook Trigger */}
                  <button
                    onClick={simulateNewWebhookEvent}
                    className="inline-flex items-center gap-1 rounded-md bg-brand-blue hover:bg-blue-700 text-[10px] font-bold text-white px-2 py-1 transition-all active:scale-95 shadow-sm"
                    title="Simulate a Brevo Webhook delivery for this agent"
                  >
                    <Send className="h-2.5 w-2.5" /> Simulate Webhook
                  </button>
                </div>

                {/* Event Feed Checklist */}
                <div className="relative flow-root">
                  <ul role="list" className="-mb-8">
                    {liveFeed.map((event, eventIdx) => {
                      const isEmail = event.channel === "email";

                      return (
                        <li key={event.id}>
                          <div className="relative pb-8">
                            {eventIdx !== liveFeed.length - 1 ? (
                              <span
                                className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex space-x-3 items-start">
                              <div>
                                <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${isEmail ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                  }`}>
                                  {isEmail ? (
                                    <Mail className="h-4 w-4" />
                                  ) : (
                                    <MessageSquare className="h-4 w-4" />
                                  )}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="text-xs text-slate-600">
                                  <span className="font-bold text-slate-950 block">{event.leadName}</span>
                                  <span className="block mt-0.5 text-[11px] leading-relaxed text-slate-500">
                                    {event.action}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-medium text-slate-400 font-mono flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {event.timeAgo}
                                  </span>

                                  {/* Follow Up CTA */}
                                  <button
                                    onClick={() => handleFollowUpAction(event.leadName)}
                                    className="inline-flex items-center rounded bg-slate-900 hover:bg-brand-blue text-[10px] font-bold text-white px-2 py-1 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                  >
                                    Follow-up
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {liveFeed.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Waiting for webhooks...
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Follow-up Overlay Interaction Modal */}
      {activeFollowUpLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-50 duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveFollowUpLead(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-blue" />
              Agent Action Desk
            </h3>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Lead Profile</p>
              <h4 className="text-base font-extrabold text-slate-950 mt-1">{activeFollowUpLead.name}</h4>
              <p className="text-xs text-slate-500 font-semibold mt-1">{activeFollowUpLead.details}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-200/60 pt-3">
                <div>
                  <span className="block text-[10px] text-slate-400">Phone</span>
                  <span className="font-mono font-semibold">{activeFollowUpLead.phone}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Email</span>
                  <span className="truncate block font-semibold" title={activeFollowUpLead.email}>{activeFollowUpLead.email}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Select an outreach channel below to contact this lead directly. Connecting will update the Lead status to <span className="font-semibold text-slate-700">In Progress</span> and log an interaction timestamp.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  triggerToast(`WhatsApp message draft opened for ${activeFollowUpLead.name}!`);
                  setActiveFollowUpLead(null);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-3 shadow-md transition-all active:scale-95"
              >
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </button>
              <button
                onClick={() => {
                  triggerToast(`Email composer launched for ${activeFollowUpLead.name}!`);
                  setActiveFollowUpLead(null);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-3 shadow-md transition-all active:scale-95"
              >
                <Mail className="h-4 w-4" /> Send Email
              </button>
            </div>

            <div className="mt-3">
              <button
                onClick={() => {
                  triggerToast(`Direct call logged to ${activeFollowUpLead.phone}!`);
                  setActiveFollowUpLead(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm px-4 py-2.5 transition-all active:scale-95"
              >
                <Phone className="h-4 w-4 text-brand-blue" /> Direct Call Dialer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

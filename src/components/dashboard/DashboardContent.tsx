"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { moveLeadsToFolder, saveFollowUp, updateFollowUpStatus } from "@/app/dashboard/actions";
import Link from "next/link";
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
  XCircle,
  Search,
  Filter,
  X,
  Upload,
  Check,
  Loader2,
  Pencil
} from "lucide-react";
import { ContactLeadButton } from "@/components/dashboard/contact-lead-button";
import { WebsiteAlertBanner } from "@/components/dashboard/WebsiteAlertBanner";
import { AddLeadsMenu } from "@/components/dashboard/add-leads-menu";
import { LeadActionsPanel } from "@/components/dashboard/lead-actions-panel";
import { LeadFilters } from "@/components/dashboard/lead-filters";
import { LeadPagination } from "@/components/dashboard/lead-pagination";
import { LeadStatusSelect } from "@/components/dashboard/lead-status-select";
import { LeadFolderBrowser } from "@/components/agent/lead-folder-browser";
import { LeadFolderMoveTable } from "@/components/agent/lead-folder-move-table";
import { LeadImport } from "@/components/agent/lead-import";
import { SUPPORT_CONTACT, LEAD_SOURCES, LEAD_STATUSES, LOAN_PRODUCTS, STATUS_LABELS } from "@/lib/constants";
import { getFolderName } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { classifyFollowUp, formatFollowUpDate } from "@/lib/follow-ups";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectItem } from "@/components/ui/select";
import { ActiveFilterChip } from "@/components/ui/active-filter-chip";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { MobileLeadCard } from "@/components/mobile/MobileLeadCard";
import { MobileBulkActionBar } from "@/components/mobile/MobileBulkActionBar";

type LeadFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  lead_count: number;
};

type Note = { id: string; note: string; created_at?: string };
type FollowUp = { id: string; due_at: string; note: string | null; status: string; completion_source?: string | null; leads?: any };

type DashboardContentProps = {
  agent: {
    id?: string;
    logo_url?: string | null;
    business_name: string;
    agent_name: string;
    city: string;
    district: string;
    slug?: string;
    trial_ends_at?: string;
    plan_status?: string;
    website_slug?: string;
    is_website_published?: boolean;
  };
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  counts: { total: number; new: number; follow_up: number; closed: number; rejected: number };
  analytics: { visits: number; submissions: number; whatsappClicks: number; conversion: number };
  activeFollowUps: FollowUp[];
  followUpGroups: { overdue: FollowUp[]; today: FollowUp[]; upcoming: FollowUp[] };
  folders: LeadFolder[];
  folderId?: string;
  filteredLeads: any[];
  visibleLeads: any[];
  page: number;
  pageSize: number;
  query: Record<string, string>;
  exportParams: URLSearchParams;
  timezone: string;
  mode?: "overview" | "leads" | "follow-ups";
  emailCampaigns?: any[];
  whatsappCampaigns?: any[];
};



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

export function DashboardContent({
  agent,
  trialDaysRemaining,
  isTrialExpired,
  counts,
  analytics,
  activeFollowUps,
  followUpGroups,
  folders,
  folderId,
  filteredLeads,
  visibleLeads,
  page,
  pageSize,
  query,
  exportParams,
  timezone,
  mode = "overview",
  emailCampaigns = [],
  whatsappCampaigns = []
}: DashboardContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [addLeadsModal, setAddLeadsModal] = useState<"manual" | "import" | null>(
    query.import === "true" ? "import" : null
  );

  // Mobile Follow-ups Workspace state
  const [activeTab, setActiveTab] = useState<"overdue" | "today" | "upcoming">("today");
  const [pendingFollowUpId, setPendingFollowUpId] = useState<string | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<any>(null);
  const [rescheduleLeadId, setRescheduleLeadId] = useState<string>("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleCompleteFollowUp = async (id: string) => {
    try {
      setPendingFollowUpId(id);
      const formData = new FormData();
      formData.append("id", id);
      formData.append("status", "completed");
      await updateFollowUpStatus(formData);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setPendingFollowUpId(null);
    }
  };

  const handleRescheduleClick = (task: any, leadId: string) => {
    setRescheduleTask(task);
    setRescheduleLeadId(leadId);
    setRescheduleNote(task.note || "");
    if (task.due_at) {
      try {
        const dateObj = new Date(task.due_at);
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
        setRescheduleDate(localISOTime);
      } catch (err) {
        setRescheduleDate("");
      }
    } else {
      setRescheduleDate("");
    }
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleDate) return;
    try {
      setIsRescheduling(true);
      const formData = new FormData();
      if (rescheduleTask?.id) {
        formData.append("id", rescheduleTask.id);
      }
      formData.append("lead_id", rescheduleLeadId);
      formData.append("due_at", rescheduleDate);
      formData.append("note", rescheduleNote);
      formData.append("timezone", timezone);
      await saveFollowUp(formData);
      setRescheduleTask(null);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRescheduling(false);
    }
  };

  useEffect(() => {
    if (query.import === "true") {
      setAddLeadsModal("import");
    } else {
      setAddLeadsModal(null);
    }
  }, [query.import]);

  const handleModalChange = (modal: "manual" | "import" | null) => {
    setAddLeadsModal(modal);
    if (modal === null && query.import === "true") {
      const params = new URLSearchParams(window.location.search);
      params.delete("import");
      router.push(`${window.location.pathname}?${params.toString()}`);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  };

  const clearSelection = () => setSelectedLeadIds([]);

  const handleMoveLeads = () => {
    setShowFolderModal(true);
  };

  const handleSelectFolder = async (folderId: string) => {
    try {
      await moveLeadsToFolder(selectedLeadIds, folderId || undefined);
      setSelectedFolderId(folderId);
      setShowFolderModal(false);
      clearSelection();
    } catch (error) {
      console.error("Error moving leads:", error);
    }
  };

  // Calculate active filter count for mobile button
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.folder) count++;
    if (query.status) count++;
    if (query.source) count++;
    if (query.loanType) count++;
    if (query.from || query.to) count++;
    return count;
  }, [query]);

  // Handle filter changes for mobile
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset page when filters change
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleRemoveFilter = (key: string) => {
    handleFilterChange(key, "");
  };

  const handleClearAllFilters = () => {
    const params = new URLSearchParams(searchParams);
    ["status", "source", "loanType", "from", "to", "page"].forEach(key => {
      params.delete(key);
    });
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <>
      {/* Top Banner */}
      {agent.plan_status === "trial" && !isTrialExpired ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-2 text-amber-900">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                <span className="text-sm font-medium">Trial ends in {trialDaysRemaining} days</span>
              </div>
              <Button variant="default" size="sm" className="text-sm h-8">Upgrade</Button>
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
              <span className="text-red-800 text-sm">You can only view your leads. Contact support to continue.</span>
              <a href={`tel:${SUPPORT_CONTACT.phone}`} className="ml-2 text-sm font-semibold underline underline-offset-4 text-red-900">
                Call now
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-6">
        {/* Website Status Alert Banner */}
        <WebsiteAlertBanner agentProfile={agent} />

        {/* Desktop header */}
        <div className="hidden md:flex mb-8 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        {/* Mobile welcome section */}
        {mode === "overview" && (
          <div className="md:hidden mb-6">
            <div className="flex items-center gap-3">
              {agent.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agent.logo_url} alt={agent.business_name} className="h-11 w-11 rounded-xl border border-slate-200 object-cover shadow-sm" />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-sm">
                  {agent.agent_name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-600">Welcome back</p>
                <h1 className="mt-0.5 text-base font-bold text-slate-900 truncate">{agent.business_name}</h1>
                <p className="text-xs text-slate-500 truncate">{agent.agent_name} · {agent.city}, {agent.district}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats section */}
        <div className="hidden md:block">
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
        </div>

        {/* Mobile stats */}
        {mode === "overview" && (
          <div className="md:hidden grid grid-cols-2 gap-3">
            <MobileStatCard label="Total leads" value={counts.total} icon={Users} color="blue" />
            <MobileStatCard label="New leads" value={counts.new} icon={Plus} color="emerald" />
            <MobileStatCard label="Follow-ups" value={counts.follow_up} icon={BellRing} color="amber" />
            <MobileStatCard label="Closed" value={counts.closed} icon={CheckCircle2} color="green" />
            <MobileStatCard label="Conversion" value={analytics.conversion} icon={TrendingUp} color="purple" fullWidth progress={analytics.conversion} />
          </div>
        )}

        {/* Follow-ups section */}
        {activeFollowUps.length && mode === "overview" ? (
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

        {/* Desktop main content with sidebar */}
        <div className="mt-8 hidden lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-1 space-y-6">
            <LeadFolderBrowser folders={folders} activeFolderId={folderId} />
            <LeadImport folderId={folderId} />
          </div>
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
                  <AddLeadsMenu 
                    disabled={isTrialExpired} 
                    openModal={addLeadsModal}
                    onModalChange={handleModalChange}
                  />
                  <a href={`/api/leads/export?${exportParams.toString()}`}>
                    <Button variant="outline" className="flex items-center gap-1.5">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <LeadFilters values={query} />
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
                              <ContactLeadButton agentId={agent.id!} leadName={lead.name} phone={lead.phone} />
                              <LeadActionsPanel
                                leadId={lead.id}
                                agentId={agent.id!}
                                leadName={lead.name}
                                timezone={timezone}
                                notes={lead.lead_notes ?? []}
                                followUps={lead.lead_follow_ups ?? []}
                                disabled={isTrialExpired}
                                lifecycle={lead.deleted_at ? "deleted" : lead.archived_at ? "archived" : "active"}
                                emailHistory={emailCampaigns.filter((c: any) => c.lead_id === lead.id)}
                                whatsappHistory={whatsappCampaigns.filter((c: any) => c.lead_id === lead.id)}
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
                <LeadPagination page={page} pageSize={pageSize} count={filteredLeads.length} query={query} />
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Mobile main content */}
        {mode === "leads" && (
          <div className="md:hidden block">
            {/* Leads header */}
            <div className="bg-white border-b border-slate-200 px-4 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-6">Leads</h2>
                  {folderId ? (
                    <p className="text-sm text-slate-500 mt-1">
                      Showing folder: <span className="font-semibold text-slate-700">{folderId === "unfiled" ? "Unfiled" : folders.find(f => f.id === folderId)?.name}</span>
                    </p>
                  ) : <p className="text-sm text-slate-500 mt-1">Manage and track your leads</p>}
                </div>
                <div className="flex items-center gap-2">
                  <AddLeadsMenu 
                  disabled={isTrialExpired} 
                  showOnlyAdd={true} 
                  openModal={addLeadsModal} 
                  onModalChange={handleModalChange} 
                />
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-lg"
                    onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                  >
                    <MoreHorizontal className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
                  </Button>
                  {showOverflowMenu && (
                    <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2 min-w-[160px]">
                      <button 
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        onClick={() => {
                          setShowOverflowMenu(false);
                          setAddLeadsModal("import");
                        }}
                      >
                        <Upload className="h-4 w-4" />
                        Bulk import
                      </button>
                      <a 
                        href={`/api/leads/export?${exportParams.toString()}`}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        onClick={() => setShowOverflowMenu(false)}
                      >
                        <Download className="h-4 w-4" />
                        Export leads
                      </a>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </div>

            {/* Search field */}
            <div className="bg-white px-4 py-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                <input
                  name="q"
                  value={query.q}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    if (e.target.value) {
                      params.set("q", e.target.value);
                    } else {
                      params.delete("q");
                    }
                    params.delete("page");
                    router.push(`/dashboard?${params.toString()}`);
                  }}
                  placeholder="Search by name or phone"
                  className="w-full h-11 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                {query.q && (
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete("q");
                      params.delete("page");
                      router.push(`/dashboard?${params.toString()}`);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            </div>

            {/* Compact control row */}
            <div className="bg-white px-4 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <form action="" method="get" className="contents">
                  <input type="hidden" name="folder" value={query.folder || ""} />
                  <input type="hidden" name="pageSize" value={query.pageSize || "20"} />
                  <input type="hidden" name="q" value={query.q || ""} />
                  
                  <Select 
                    name="view" 
                    value={query.view || "active"}
                    onValueChange={(value) => handleFilterChange("view", value)}
                    className="flex-1 min-w-[100px]"
                  >
                    <SelectItem value="active">Active leads</SelectItem>
                    <SelectItem value="archived">Archived leads</SelectItem>
                    <SelectItem value="deleted">Deleted leads</SelectItem>
                  </Select>
                  
                  <Select 
                    name="sort" 
                    value={query.sort || "created_desc"}
                    onValueChange={(value) => handleFilterChange("sort", value)}
                    className="flex-1 min-w-[100px]"
                  >
                    <SelectItem value="created_desc">Newest first</SelectItem>
                    <SelectItem value="created_asc">Oldest first</SelectItem>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-1.5 text-sm h-10"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowFilterSheet(true);
                    }}
                  >
                    <Filter className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs font-semibold rounded-full px-1.5 py-0.5">{activeFilterCount}</span>
                    )}
                    Filters
                  </Button>
                </form>
              </div>

              {/* Active filter chips */}
              {activeFilterCount > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {query.folder && (
                    <ActiveFilterChip
                      label="Folder"
                      value={query.folder === "unfiled" ? "Unfiled" : getFolderName(folders, query.folder) || ""}
                      onRemove={() => handleRemoveFilter("folder")}
                    />
                  )}
                  {query.status && (
                    <ActiveFilterChip
                      label="Status"
                      value={STATUS_LABELS[query.status as keyof typeof STATUS_LABELS] || query.status}
                      onRemove={() => handleRemoveFilter("status")}
                    />
                  )}
                  {query.source && (
                    <ActiveFilterChip
                      label="Source"
                      value={query.source}
                      onRemove={() => handleRemoveFilter("source")}
                    />
                  )}
                  {query.loanType && (
                    <ActiveFilterChip
                      label="Loan type"
                      value={query.loanType}
                      onRemove={() => handleRemoveFilter("loanType")}
                    />
                  )}
                  {query.from && (
                    <ActiveFilterChip
                      label="From"
                      value={query.from}
                      onRemove={() => {
                        handleRemoveFilter("from");
                        handleRemoveFilter("to");
                      }}
                    />
                  )}
                  {query.to && !query.from && (
                    <ActiveFilterChip
                      label="To"
                      value={query.to}
                      onRemove={() => handleRemoveFilter("to")}
                    />
                  )}
                </div>
              )}
            </div>

            <LeadFolderMoveTable folders={folders} disabled={isTrialExpired} />
            
            {/* Leads list */}
            <div className="px-4 py-4 space-y-3">
              {visibleLeads.map((lead) => (
                <MobileLeadCard
                  key={lead.id}
                  lead={{
                    ...lead,
                    folderName: getFolderName(folders, lead.folder_id)
                  }}
                  agentId={agent.id!}
                  timezone={timezone}
                  isSelected={selectedLeadIds.includes(lead.id)}
                  onSelect={toggleLeadSelection}
                  isTrialExpired={isTrialExpired}
                  emailHistory={emailCampaigns.filter((c: any) => c.lead_id === lead.id)}
                  whatsappHistory={whatsappCampaigns.filter((c: any) => c.lead_id === lead.id)}
                />
              ))}
              {!visibleLeads.length ? (
                <div className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-10 w-10 text-slate-300" />
                    <p className="text-sm text-slate-500">No leads yet. Share your public page to start receiving enquiries.</p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Pagination */}
            <div className="px-4 pb-4">
              <LeadPagination page={page} pageSize={pageSize} count={filteredLeads.length} query={query} />
            </div>
          </div>
        )}

        {/* Mobile follow-ups workspace */}
        {mode === "follow-ups" && (
          <div className="md:hidden block space-y-4">
            <div className="bg-white border-b border-slate-200 px-4 py-4">
              <h2 className="text-xl font-bold text-slate-900 leading-6">Follow-ups</h2>
              <p className="text-sm text-slate-500 mt-1">Manage reminders and upcoming lead activities</p>
            </div>

            {/* Tabs for Overdue, Today, Upcoming */}
            <div className="flex border-b border-slate-200 bg-white">
              {(["overdue", "today", "upcoming"] as const).map((tab) => {
                const count = followUpGroups[tab].length;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors capitalize relative ${
                      isActive 
                        ? "border-blue-600 text-blue-600" 
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                    {count > 0 && (
                      <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        tab === 'overdue' ? 'bg-red-100 text-red-600' : tab === 'today' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Checklist of Tasks */}
            <div className="px-4 py-2 space-y-3">
              {followUpGroups[activeTab].length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium text-slate-900">All caught up!</p>
                  <p className="text-xs text-slate-500 mt-1">No pending follow-ups in this section.</p>
                </div>
              ) : (
                followUpGroups[activeTab].map((task) => {
                  const lead = Array.isArray(task.leads) ? task.leads[0] : task.leads;
                  return (
                    <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{lead?.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{lead?.loan_type} · {lead?.phone}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          activeTab === 'overdue' ? 'bg-red-50 text-red-700 border border-red-100' : activeTab === 'today' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-700 border border-slate-100'
                        }`}>
                          {formatFollowUpDate(task.due_at, timezone)}
                        </span>
                      </div>

                      {task.note && (
                        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 italic">
                          &quot;{task.note}&quot;
                        </p>
                      )}

                      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 h-9"
                          onClick={() => handleCompleteFollowUp(task.id)}
                          disabled={pendingFollowUpId === task.id}
                        >
                          {pendingFollowUpId === task.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                          ) : (
                            <Check className="h-4 w-4 mr-1.5" />
                          )}
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-slate-700 hover:bg-slate-50 h-9"
                          onClick={() => handleRescheduleClick(task, lead?.id)}
                        >
                          <Pencil className="h-4 w-4 mr-1.5" />
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile bulk action bar */}
      {mode === "leads" && (
        <MobileBulkActionBar
          selectedCount={selectedLeadIds.length}
          onMove={handleMoveLeads}
          onCancel={clearSelection}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Reschedule Follow-up</h3>
              <button 
                onClick={() => setRescheduleTask(null)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Follow-up Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Note</label>
                <textarea 
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  placeholder="What should you discuss?"
                  className="w-full min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRescheduleTask(null)}
                disabled={isRescheduling}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                onClick={handleSaveReschedule}
                disabled={isRescheduling || !rescheduleDate}
              >
                {isRescheduling ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                Save Follow-up
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Selector Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowFolderModal(false)} 
          />
          <div className="relative w-full bg-white rounded-t-3xl max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Select Folder</h2>
              <button 
                onClick={() => setShowFolderModal(false)} 
                className="text-slate-500 hover:text-slate-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 py-2">
              <button
                key="unfiled"
                onClick={() => handleSelectFolder("")}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
              >
                <Folder className="h-5 w-5 text-slate-500" />
                <span className="text-sm font-medium text-slate-900">Unfiled</span>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleSelectFolder(folder.id)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <Folder className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-medium text-slate-900">{folder.name}</span>
                  <span className="ml-auto text-xs text-slate-500">{folder.lead_count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter bottom sheet */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowFilterSheet(false)} 
          />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Filters</h3>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearAllFilters}
                    className="text-sm"
                  >
                    Reset
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setShowFilterSheet(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-5 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Folder</label>
                <Select 
                  name="folder" 
                  value={query.folder || ""} 
                  onValueChange={(value) => handleFilterChange("folder", value)}
                >
                  <SelectItem value="">All leads</SelectItem>
                  <SelectItem value="unfiled">Unfiled</SelectItem>
                  {folders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <Select 
                  name="status" 
                  value={query.status || ""} 
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectItem value="">All statuses</SelectItem>
                  {LEAD_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</SelectItem>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
                <Select 
                  name="source" 
                  value={query.source || ""} 
                  onValueChange={(value) => handleFilterChange("source", value)}
                >
                  <SelectItem value="">All sources</SelectItem>
                  {LEAD_SOURCES.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loan type</label>
                <Select 
                  name="loanType" 
                  value={query.loanType || ""} 
                  onValueChange={(value) => handleFilterChange("loanType", value)}
                >
                  <SelectItem value="">All loan types</SelectItem>
                  {LOAN_PRODUCTS.map(loanType => (
                    <SelectItem key={loanType} value={loanType}>{loanType}</SelectItem>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Created date</label>
                <DateRangePicker 
                  from={query.from || ""} 
                  to={query.to || ""} 
                  onFromChange={(val) => handleFilterChange("from", val)} 
                  onToChange={(val) => handleFilterChange("to", val)} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

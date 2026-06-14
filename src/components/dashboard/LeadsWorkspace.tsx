"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Settings,
  Download,
  MoreHorizontal,
  Plus,
  X
} from "lucide-react";
import {
  LeadFilters
} from "@/components/dashboard/lead-filters";
import {
  LeadPagination
} from "@/components/dashboard/lead-pagination";
import {
  LeadStatusSelect
} from "@/components/dashboard/lead-status-select";
import {
  ContactLeadButton
} from "@/components/dashboard/contact-lead-button";
import {
  LeadActionsPanel
} from "@/components/dashboard/lead-actions-panel";
import {
  AddLeadsMenu
} from "@/components/dashboard/add-leads-menu";
import {
  getFolderName
} from "@/lib/utils";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import {
  Button
} from "@/components/ui/button";
import {
  Select,
  SelectItem
} from "@/components/ui/select";
import {
  ActiveFilterChip
} from "@/components/ui/active-filter-chip";
import {
  useRouter
} from "next/navigation";
import {
  STATUS_LABELS
} from "@/lib/constants";

type LeadsWorkspaceProps = {
  agent: any;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  folders: any[];
  folderId: string | undefined;
  filteredLeads: any[];
  visibleLeads: any[];
  page: number;
  pageSize: number;
  query: any;
  exportParams: URLSearchParams;
  timezone: string;
  emailCampaigns?: any[];
  whatsappCampaigns?: any[];
};

export function LeadsWorkspace({
  agent,
  isTrialExpired,
  folders,
  folderId,
  filteredLeads,
  visibleLeads,
  page,
  pageSize,
  query,
  exportParams,
  timezone,
  emailCampaigns = [],
  whatsappCampaigns = []
}: LeadsWorkspaceProps) {
  const router = useRouter();
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [addLeadsModal, setAddLeadsModal] = useState<"manual" | "import" | null>(
    query.import === "true" ? "import" : null
  );
  
  // Column display states
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("leadhub-visible-columns");
      return saved ? JSON.parse(saved) : ["loan", "amount", "status", "folder"];
    }
    return ["loan", "amount", "status", "folder"];
  });

  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [activeLeadForDetails, setActiveLeadForDetails] = useState<any | null>(null);

  const toggleColumn = (col: string) => {
    setVisibleColumns(prev => {
      const next = prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col];
      localStorage.setItem("leadhub-visible-columns", JSON.stringify(next));
      return next;
    });
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
  
  // Exclude non-filter parameters but include folder in the badge count
  const activeFilterCount = Object.entries(query).filter(([key, value]) => {
    if (key === "q" || key === "view" || key === "sort" || key === "page" || key === "pageSize") return false;
    return value;
  }).length;
  
  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  
  const clearSelection = () => setSelectedLeadIds([]);
  
  const handleSearchChange = (val: string) => {
    const params = new URLSearchParams(query);
    if (val) {
      params.set("q", val);
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/dashboard/leads?${params.toString()}`);
  };
  
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(query);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/dashboard/leads?${params.toString()}`);
  };
  
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Leads Page Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-1.5">
              Leads {folderId && <span className="text-slate-400 font-normal">/</span>}
              {folderId && (
                <span className="text-blue-600 font-medium">
                  {folderId === "unfiled" ? "Unfiled" : getFolderName(folders, folderId)}
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage, organize and follow up with your leads</p>
          </div>
          <div className="flex items-center gap-2">
            <AddLeadsMenu 
              disabled={isTrialExpired} 
              openModal={addLeadsModal}
              onModalChange={handleModalChange}
            />
            <div className="relative group">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg">
                <MoreHorizontal className="h-5 w-5 text-slate-600" strokeWidth={1.75} />
              </Button>
              <div className="absolute right-0 top-12 w-48 hidden group-hover:block rounded-lg border border-slate-200 bg-white shadow-lg z-10">
                <div className="py-1">
                  <a href={`/api/leads/export?${exportParams.toString()}`} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Download className="h-4 w-4" />
                    Export leads
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Leads List Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Filter Toolbar */}
        <div className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
              <input 
                value={query.q || ""}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search leads..."
                className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            {/* Filters Button */}
            <Button 
              variant={showFilters ? "default" : "outline"}
              className="h-10 flex items-center gap-2"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="h-4 w-4" strokeWidth={1.75} />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            
            {/* Columns Settings Button and Dropdown */}
            <div className="relative">
              <Button 
                variant="outline" 
                className="h-10 flex items-center gap-2"
                onClick={() => setShowColumnMenu(!showColumnMenu)}
              >
                <Settings className="h-4 w-4" strokeWidth={1.75} />
                Columns
              </Button>
              {showColumnMenu && (
                <div className="absolute right-0 top-12 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-20 py-2">
                  <p className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Toggle Columns</p>
                  <div className="border-b border-slate-100 my-1"></div>
                  {[
                    { key: "loan", label: "Loan Product" },
                    { key: "amount", label: "Required Amount" },
                    { key: "status", label: "Status" },
                    { key: "folder", label: "Folder" }
                  ].map((col) => (
                    <label key={col.key} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* View & Sort */}
          <div className="flex items-center gap-3 mb-3">
            <Select value={query.view || "active"} onValueChange={(v) => handleFilterChange("view", v)}>
              <SelectItem value="active">Active leads</SelectItem>
              <SelectItem value="archived">Archived leads</SelectItem>
              <SelectItem value="deleted">Deleted leads</SelectItem>
            </Select>
            
            <Select value={query.sort || "created_desc"} onValueChange={(v) => handleFilterChange("sort", v)}>
              <SelectItem value="created_desc">Newest first</SelectItem>
              <SelectItem value="created_asc">Oldest first</SelectItem>
            </Select>
          </div>
          
          {/* Active Filters */}
          {Object.entries(query).some(([key, value]) => {
            if (key === "q" || key === "view" || key === "sort" || key === "page" || key === "pageSize") return false;
            return !!value;
          }) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {query.folder && (
                <ActiveFilterChip 
                  label="Folder" 
                  value={query.folder === "unfiled" ? "Unfiled" : getFolderName(folders, query.folder) || ""} 
                  onRemove={() => handleFilterChange("folder", "")}
                />
              )}
              {query.status && (
                <ActiveFilterChip 
                  label="Status" 
                  value={STATUS_LABELS[query.status as keyof typeof STATUS_LABELS] || query.status} 
                  onRemove={() => handleFilterChange("status", "")}
                />
              )}
              {query.source && (
                <ActiveFilterChip 
                  label="Source" 
                  value={query.source} 
                  onRemove={() => handleFilterChange("source", "")}
                />
              )}
              {query.loanType && (
                <ActiveFilterChip 
                  label="Loan type" 
                  value={query.loanType} 
                  onRemove={() => handleFilterChange("loanType", "")}
                />
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-900"
                onClick={() => {
                  const params = new URLSearchParams(query);
                  ["folder", "status", "source", "loanType", "from", "to", "followUp"].forEach(k => params.delete(k));
                  params.delete("page");
                  router.push(`/dashboard/leads?${params.toString()}`);
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
        
        {/* Filters Modal Popup */}
        {showFilters && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Filter Leads</h3>
                  <p className="text-xs text-slate-500">Refine the list of leads shown in the workspace</p>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setShowFilters(false)}
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              </header>
              <div className="overflow-y-auto flex-1">
                <LeadFilters values={query} />
              </div>
            </div>
          </div>
        )}
        
        {/* Bulk Action Bar */}
        <div className="min-h-[48px]">
          {selectedLeadIds.length > 0 && (
            <div className="border-b border-slate-200 bg-blue-50 px-8 py-3 flex items-center gap-3">
              <span className="text-sm font-semibold text-blue-900">
                {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? "s" : ""} selected
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-700"
                onClick={clearSelection}
              >
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="bg-blue-600"
                disabled={isTrialExpired}
              >
                Move to folder
              </Button>
            </div>
          )}
        </div>
        
        {/* Lead Table */}
        <div className="flex-1 overflow-auto p-8">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4"><span className="sr-only">Select</span></th>
                      <th className="p-4 text-xs font-medium text-slate-500">Lead</th>
                      {visibleColumns.includes("loan") && <th className="p-4 text-xs font-medium text-slate-500">Loan</th>}
                      {visibleColumns.includes("amount") && <th className="p-4 text-xs font-medium text-slate-500">Amount</th>}
                      {visibleColumns.includes("status") && <th className="p-4 text-xs font-medium text-slate-500">Status</th>}
                      {visibleColumns.includes("folder") && <th className="p-4 text-xs font-medium text-slate-500">Folder</th>}
                      <th className="p-4 text-xs font-medium text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className={`hover:bg-slate-50 transition-colors ${selectedLeadIds.includes(lead.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            name="lead_ids" 
                            value={lead.id}
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                            disabled={isTrialExpired}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td 
                          className="p-4 cursor-pointer"
                          onClick={() => setActiveLeadForDetails(lead)}
                        >
                          <p className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">{lead.name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">
                            {lead.email || lead.phone}
                          </p>
                        </td>
                        {visibleColumns.includes("loan") && <td className="p-4 text-slate-600">{lead.loan_type}</td>}
                        {visibleColumns.includes("amount") && (
                          <td className="p-4 font-medium text-slate-900">
                            {Number(lead.required_amount).toLocaleString("en-IN", { 
                              style: "currency", 
                              currency: "INR", 
                              maximumFractionDigits: 0 
                            })}
                          </td>
                        )}
                        {visibleColumns.includes("status") && (
                          <td className="p-4">
                            {isTrialExpired ? (
                              <span className="text-sm text-slate-500">Locked</span>
                            ) : (
                              <LeadStatusSelect leadId={lead.id} status={lead.status} />
                            )}
                          </td>
                        )}
                        {visibleColumns.includes("folder") && (
                          <td className="p-4">
                            {lead.folder_id ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                {getFolderName(folders, lead.folder_id)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="p-4 text-right">
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
                              phone={lead.phone}
                              email={lead.email}
                              loanType={lead.loan_type}
                              requiredAmount={lead.required_amount}
                              status={lead.status}
                              folderName={lead.folder_id ? getFolderName(folders, lead.folder_id) : null}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visibleLeads.length ? (
                      <tr>
                        <td colSpan={visibleColumns.length + 3} className="p-12 text-center">
                          <p className="text-sm text-slate-500">No leads match your filters</p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardContent className="p-4">
              <LeadPagination 
                page={page} 
                pageSize={pageSize} 
                count={filteredLeads.length} 
                query={query} 
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {activeLeadForDetails && (
        <LeadActionsPanel
          leadId={activeLeadForDetails.id}
          agentId={agent.id!}
          leadName={activeLeadForDetails.name}
          timezone={timezone}
          notes={activeLeadForDetails.lead_notes ?? []}
          followUps={activeLeadForDetails.lead_follow_ups ?? []}
          disabled={isTrialExpired}
          lifecycle={activeLeadForDetails.deleted_at ? "deleted" : activeLeadForDetails.archived_at ? "archived" : "active"}
          emailHistory={emailCampaigns.filter((c: any) => c.lead_id === activeLeadForDetails.id)}
          whatsappHistory={whatsappCampaigns.filter((c: any) => c.lead_id === activeLeadForDetails.id)}
          phone={activeLeadForDetails.phone}
          email={activeLeadForDetails.email}
          loanType={activeLeadForDetails.loan_type}
          requiredAmount={activeLeadForDetails.required_amount}
          status={activeLeadForDetails.status}
          folderName={activeLeadForDetails.folder_id ? getFolderName(folders, activeLeadForDetails.folder_id) : null}
          openOverride={true}
          onCloseOverride={() => setActiveLeadForDetails(null)}
        />
      )}
    </div>
  );
}
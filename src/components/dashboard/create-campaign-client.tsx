"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Folder, 
  User, 
  ArrowLeft, 
  Mail, 
  MessageSquare,
  Sparkles,
  Search,
  CheckSquare,
  Square
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AgentCampaignSender } from "@/components/dashboard/agent-campaign-sender";

type Template = {
  id: string;
  name: string;
  subject: string;
  content: string;
  brochure_attached: boolean;
  pdf_urls: string[] | null;
  show_header: boolean;
  header_content?: string | null;
  header_bg_color?: string | null;
  header_text_color?: string | null;
  footer_content?: string | null;
  footer_bg_color?: string | null;
  footer_text_color?: string | null;
  channel?: 'email' | 'whatsapp' | null;
};

type CreateCampaignClientProps = {
  agent: any;
  leads: any[];
  folders: any[];
  templates: Template[];
  isTrialExpired: boolean;
  queryParams: {
    target?: string;
    folderId?: string;
    leadId?: string;
  };
};

export function CreateCampaignClient({
  agent,
  leads,
  folders,
  templates,
  isTrialExpired,
  queryParams
}: CreateCampaignClientProps) {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState<'email' | 'whatsapp'>('email');

  // Audience Target Selection Mode
  const [selectionMode, setSelectionMode] = useState<"all" | "folder" | "individual">(() => {
    if (queryParams.leadId) return "individual";
    if (queryParams.folderId) return "folder";
    return "all";
  });

  // Folder selection state
  const [selectedFolderId, setSelectedFolderId] = useState<string>(queryParams.folderId || "");
  const [folderSearch, setFolderSearch] = useState("");

  // Individual selection state
  const [individualSelectedIds, setIndividualSelectedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (queryParams.leadId) {
      initial[queryParams.leadId] = true;
    } else {
      // Default: select all leads initially
      leads.forEach(l => {
        initial[l.id] = true;
      });
    }
    return initial;
  });
  const [leadSearch, setLeadSearch] = useState("");

  // Filter folders based on text search
  const filteredFoldersList = useMemo(() => {
    return folders.filter(f => 
      f.name.toLowerCase().includes(folderSearch.toLowerCase())
    );
  }, [folders, folderSearch]);

  // Filter leads list for individual selector UI view
  const filteredLeadsList = useMemo(() => {
    return leads.filter(l => 
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      (l.email && l.email.toLowerCase().includes(leadSearch.toLowerCase())) ||
      (l.phone && l.phone.includes(leadSearch))
    );
  }, [leads, leadSearch]);

  // Compute selected leads dynamically based on active selection mode
  const selectedLeads = useMemo(() => {
    if (selectionMode === "all") {
      return leads;
    }
    if (selectionMode === "folder") {
      if (!selectedFolderId) return [];
      return leads.filter(l => l.folder_id === selectedFolderId);
    }
    if (selectionMode === "individual") {
      return leads.filter(l => !!individualSelectedIds[l.id]);
    }
    return leads;
  }, [selectionMode, leads, selectedFolderId, individualSelectedIds]);

  const selectedLeadIds = useMemo(() => selectedLeads.map(l => l.id), [selectedLeads]);

  // Checkbox toggle helpers
  const allLeadsSelected = useMemo(() => {
    return leads.length > 0 && leads.every(l => !!individualSelectedIds[l.id]);
  }, [leads, individualSelectedIds]);

  const handleToggleAll = () => {
    if (allLeadsSelected) {
      const updated: Record<string, boolean> = {};
      leads.forEach(l => {
        updated[l.id] = false;
      });
      setIndividualSelectedIds(updated);
    } else {
      const updated: Record<string, boolean> = {};
      leads.forEach(l => {
        updated[l.id] = true;
      });
      setIndividualSelectedIds(updated);
    }
  };

  const handleToggleLead = (leadId: string) => {
    setIndividualSelectedIds(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  const handleSendSuccess = () => {
    router.push("/dashboard/campaigns");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/campaigns" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft className="h-3 w-3" /> Back to campaigns
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-brand-blue" />
              New Campaign Outreach
            </h1>
            <p className="text-sm text-slate-500 mt-1">Configure outreach templates and send messages to targeted leads.</p>
          </div>

          {/* Channel Selectors */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm h-11 items-center shrink-0">
            <button
              onClick={() => setActiveChannel("email")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all h-9 ${
                activeChannel === "email"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              onClick={() => setActiveChannel("whatsapp")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all h-9 ${
                activeChannel === "whatsapp"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Grid Split: Left panel (Audience context) & Right panel (Sender tool) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Audience Segment Context */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
            
            {/* Header Title */}
            <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/50 flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-blue" />
              <h3 className="font-bold text-slate-900 text-sm">Target Segment</h3>
            </div>

            <CardContent className="p-5">
              
              {/* Segmented Picker Tabs */}
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 mb-4 shadow-inner">
                <button
                  type="button"
                  onClick={() => setSelectionMode("all")}
                  className={`rounded-md py-1.5 text-xs font-semibold text-center transition-all ${
                    selectionMode === "all"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  All Leads
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode("folder")}
                  className={`rounded-md py-1.5 text-xs font-semibold text-center transition-all ${
                    selectionMode === "folder"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Folders
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode("individual")}
                  className={`rounded-md py-1.5 text-xs font-semibold text-center transition-all ${
                    selectionMode === "individual"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Individual
                </button>
              </div>

              {/* Mode Specific Selection Controls */}
              
              {/* A. All Leads details */}
              {selectionMode === "all" && (
                <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl mb-4 text-xs">
                  <p className="font-bold text-brand-blue flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Targeting All Workspace Leads
                  </p>
                  <p className="text-slate-500 mt-1 leading-relaxed">
                    This selection targets all {leads.length} active leads currently registered under your agent account.
                  </p>
                </div>
              )}

              {/* B. Folders searchable dropdown select */}
              {selectionMode === "folder" && (
                <div className="space-y-2.5 mb-4 bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Search & Select Folder</label>
                  
                  {/* Search filter input */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search folders..."
                      value={folderSearch}
                      onChange={(e) => setFolderSearch(e.target.value)}
                      className="w-full h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Dropdown select */}
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose a target folder --</option>
                    {filteredFoldersList.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({leads.filter(l => l.folder_id === f.id).length} leads)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* C. Individual lead select controls */}
              {selectionMode === "individual" && (
                <div className="space-y-2.5 mb-4 bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Recipients Selection</label>
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {allLeadsSelected ? "Deselect All" : "Select All Leads"}
                    </button>
                  </div>
                  
                  {/* Lead filter search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter leads by name, email, phone..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="w-full h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Targeted List Preview Registry */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Recipients ({selectedLeads.length})
                  </p>
                  {selectionMode === "individual" && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      Ticked: {selectedLeads.length} / {leads.length}
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  
                  {/* Render with check triggers when individual selection is active */}
                  {selectionMode === "individual" ? (
                    filteredLeadsList.map((lead) => {
                      const isSelected = !!individualSelectedIds[lead.id];
                      return (
                        <div
                          key={lead.id}
                          onClick={() => handleToggleLead(lead.id)}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                            isSelected 
                              ? "border-blue-200 bg-blue-50/20" 
                              : "border-slate-100 bg-slate-50/30 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-brand-blue" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate">{lead.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lead.phone || lead.email || "No details"}</p>
                          </div>
                          <span className="shrink-0 text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 uppercase font-semibold">
                            {lead.status}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    
                    // Render simple read-only listing for All / Folder targets
                    selectedLeads.map((lead) => (
                      <div key={lead.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{lead.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lead.phone || lead.email || "No details"}</p>
                        </div>
                        <span className="shrink-0 text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 uppercase font-semibold">
                          {lead.status}
                        </span>
                      </div>
                    ))
                  )}

                  {/* Empty States */}
                  {selectionMode === "folder" && !selectedFolderId && (
                    <p className="text-xs text-slate-400 text-center py-6">Please select a target folder above.</p>
                  )}

                  {selectedLeads.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No recipients select target criteria.</p>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Campaign Configuration & Dispatcher */}
        <div className="lg:col-span-8 min-w-0">
          <AgentCampaignSender
            agent={agent}
            selectedLeadIds={selectedLeadIds}
            templates={templates.filter(t => t.channel === activeChannel)}
            activeChannel={activeChannel}
            isTrialExpired={isTrialExpired}
            onSendSuccess={handleSendSuccess}
          />
        </div>

      </div>
    </div>
  );
}

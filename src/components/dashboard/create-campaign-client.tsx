"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  CheckCircle,
  HelpCircle
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

  // Determine initial audience selection type from query parameters
  const initialType = useMemo(() => {
    if (queryParams.leadId) return "individual";
    if (queryParams.folderId) return "folder";
    return "all";
  }, [queryParams]);

  const [audienceType, setAudienceType] = useState<"all" | "folder" | "individual">(initialType);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(queryParams.folderId || "");
  
  // Searchable folder dropdown states
  const [folderSearch, setFolderSearch] = useState("");
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  // Individual selection state (map of leadId -> boolean)
  const [checkedLeadIds, setCheckedLeadIds] = useState<Record<string, boolean>>(() => {
    const initialChecked: Record<string, boolean> = {};
    if (queryParams.leadId) {
      initialChecked[queryParams.leadId] = true;
    } else {
      // By default, check all leads
      leads.forEach(l => {
        initialChecked[l.id] = true;
      });
    }
    return initialChecked;
  });

  // Close folder dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(event.target as Node)) {
        setShowFolderDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter folders based on search query
  const filteredFolders = useMemo(() => {
    return folders.filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase()));
  }, [folders, folderSearch]);

  const selectedFolderName = useMemo(() => {
    return folders.find(f => f.id === selectedFolderId)?.name || "";
  }, [folders, selectedFolderId]);

  // Compute active recipient list to render in Left Panel
  const activeRecipients = useMemo(() => {
    if (audienceType === "all") {
      return leads;
    }
    if (audienceType === "folder") {
      return leads.filter(l => l.folder_id === selectedFolderId);
    }
    if (audienceType === "individual") {
      return leads;
    }
    return [];
  }, [audienceType, selectedFolderId, leads]);

  // Compute selected leads array to pass to AgentCampaignSender
  const selectedLeads = useMemo(() => {
    if (audienceType === "all") {
      return leads;
    }
    if (audienceType === "folder") {
      return leads.filter(l => l.folder_id === selectedFolderId);
    }
    if (audienceType === "individual") {
      return leads.filter(l => !!checkedLeadIds[l.id]);
    }
    return [];
  }, [audienceType, selectedFolderId, checkedLeadIds, leads]);

  const selectedLeadIds = useMemo(() => selectedLeads.map(l => l.id), [selectedLeads]);

  // Handle individual "Select All" toggle
  const allSelected = useMemo(() => {
    return leads.length > 0 && leads.every(l => !!checkedLeadIds[l.id]);
  }, [leads, checkedLeadIds]);

  const handleSelectAllToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    const newChecked: Record<string, boolean> = {};
    leads.forEach(l => {
      newChecked[l.id] = checked;
    });
    setCheckedLeadIds(newChecked);
  };

  const handleSingleLeadCheckboxChange = (leadId: string) => {
    setCheckedLeadIds(prev => ({
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

      {/* Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Dynamic Audience Selection Panel */}
        <div className="lg:col-span-4 space-y-5">
          <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
            <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/50 flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-blue" />
              <h3 className="font-bold text-slate-900 text-sm">Target Segment</h3>
            </div>
            
            <CardContent className="p-5 space-y-5">
              
              {/* Segment Toggle Picker */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Audience Targeting</label>
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setAudienceType("all")}
                    className={`rounded-lg py-2 text-xs font-bold transition-all ${
                      audienceType === "all"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    All Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceType("folder")}
                    className={`rounded-lg py-2 text-xs font-bold transition-all ${
                      audienceType === "folder"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    By Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceType("individual")}
                    className={`rounded-lg py-2 text-xs font-bold transition-all ${
                      audienceType === "individual"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    Individual
                  </button>
                </div>
              </div>

              {/* Folder Searchable Dropdown */}
              {audienceType === "folder" && (
                <div className="space-y-2 animate-in slide-in-from-top-1 duration-200" ref={folderDropdownRef}>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Target Folder</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search and select folder..."
                      value={showFolderDropdown ? folderSearch : selectedFolderName || folderSearch}
                      onChange={(e) => {
                        setFolderSearch(e.target.value);
                        setShowFolderDropdown(true);
                      }}
                      onFocus={() => {
                        setShowFolderDropdown(true);
                        setFolderSearch("");
                      }}
                      className="w-full h-11 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-brand-blue"
                    />
                    
                    {showFolderDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 divide-y divide-slate-50">
                        {filteredFolders.map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setSelectedFolderId(f.id);
                              setShowFolderDropdown(false);
                              setFolderSearch("");
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 font-bold transition-colors flex items-center justify-between ${
                              selectedFolderId === f.id ? "text-brand-blue bg-blue-50/30" : "text-slate-800"
                            }`}
                          >
                            <span>{f.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-full">
                              {leads.filter(l => l.folder_id === f.id).length} leads
                            </span>
                          </button>
                        ))}
                        {filteredFolders.length === 0 && (
                          <div className="px-4 py-3 text-xs text-slate-400 text-center">No folders matched</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Target Registry List */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Recipients ({selectedLeads.length})
                  </p>
                  
                  {/* Select All checkbox for Individual Select view */}
                  {audienceType === "individual" && leads.length > 0 && (
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAllToggle}
                        className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue h-3.5 w-3.5"
                      />
                      Select All
                    </label>
                  )}
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {activeRecipients.map((lead) => {
                    const isChecked = !!checkedLeadIds[lead.id];
                    
                    return (
                      <div 
                        key={lead.id} 
                        onClick={() => {
                          if (audienceType === "individual") {
                            handleSingleLeadCheckboxChange(lead.id);
                          }
                        }}
                        className={`p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs flex items-center justify-between gap-3 transition-colors ${
                          audienceType === "individual" 
                            ? "cursor-pointer hover:bg-slate-100/60" 
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {audienceType === "individual" && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleSingleLeadCheckboxChange(lead.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue h-4 w-4 shrink-0 cursor-pointer"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{lead.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lead.phone || lead.email || "No details"}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 uppercase font-semibold">
                          {lead.status}
                        </span>
                      </div>
                    );
                  })}
                  {activeRecipients.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No matching recipients found.</p>
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

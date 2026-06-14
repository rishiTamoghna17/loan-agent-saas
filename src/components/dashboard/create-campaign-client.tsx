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
  Sparkles
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

  // Compute selected leads based on query parameters
  const { selectedLeads, audienceSummary } = useMemo(() => {
    const { target, folderId, leadId } = queryParams;

    if (leadId) {
      const singleLead = leads.find(l => l.id === leadId);
      return {
        selectedLeads: singleLead ? [singleLead] : [],
        audienceSummary: {
          type: "single",
          title: "Individual Lead Target",
          description: singleLead 
            ? `Outreach targeted at ${singleLead.name} (${singleLead.phone || singleLead.email || "No contact info"})`
            : "No matching lead found"
        }
      };
    }

    if (folderId) {
      const targetFolder = folders.find(f => f.id === folderId);
      const folderLeads = leads.filter(l => l.folder_id === folderId);
      return {
        selectedLeads: folderLeads,
        audienceSummary: {
          type: "folder",
          title: `Folder Segment: ${targetFolder?.name || "Custom Segment"}`,
          description: `Outreach targeted at ${folderLeads.length} leads in this folder.`
        }
      };
    }

    if (target === "all") {
      return {
        selectedLeads: leads,
        audienceSummary: {
          type: "all",
          title: "All Active Leads",
          description: `Outreach targeted at all ${leads.length} active workspace leads.`
        }
      };
    }

    // Default fallback (Target All)
    return {
      selectedLeads: leads,
      audienceSummary: {
        type: "all",
        title: "All Workspace Leads (Default)",
        description: `No criteria specified. Target audience set to all ${leads.length} active leads.`
      }
    };
  }, [queryParams, leads, folders]);

  const selectedLeadIds = useMemo(() => selectedLeads.map(l => l.id), [selectedLeads]);

  const handleSendSuccess = () => {
    // Redirect to campaigns tab on success
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
            <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/50 flex items-center gap-2">
              {audienceSummary.type === "single" ? (
                <User className="h-4 w-4 text-blue-600" />
              ) : audienceSummary.type === "folder" ? (
                <Folder className="h-4 w-4 text-amber-500" />
              ) : (
                <Users className="h-4 w-4 text-emerald-600" />
              )}
              <h3 className="font-bold text-slate-900 text-sm">Target Segment</h3>
            </div>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-base font-extrabold text-slate-950">{audienceSummary.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{audienceSummary.description}</p>
              </div>

              {/* Targeted List Preview */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Recipients ({selectedLeads.length})</p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedLeads.map((lead) => (
                    <div key={lead.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{lead.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lead.phone || lead.email || "No details"}</p>
                      </div>
                      <span className="shrink-0 text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 uppercase font-semibold">
                        {lead.status}
                      </span>
                    </div>
                  ))}
                  {selectedLeads.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No recipients pre-selected.</p>
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

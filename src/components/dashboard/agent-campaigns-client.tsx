"use client";

import { useState, useMemo } from "react";
import { 
  Mail, 
  History, 
  Search, 
  Users, 
  CheckCircle2, 
  Eye, 
  MousePointerClick, 
  AlertCircle,
  Clock,
  Send,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentCampaignSender } from "@/components/dashboard/agent-campaign-sender";
import { formatDate } from "@/lib/format";

type AgentCampaignsClientProps = {
  agent: any;
  leads: any[];
  templates: any[];
  campaigns: any[]; // email campaigns
  whatsappCampaigns?: any[];
  timezone: string;
  isTrialExpired: boolean;
};

export function AgentCampaignsClient({
  agent,
  leads,
  templates,
  campaigns,
  whatsappCampaigns = [],
  timezone,
  isTrialExpired
}: AgentCampaignsClientProps) {
  const [activeTab, setActiveTab] = useState<"send" | "history">("send");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState<'email' | 'whatsapp'>('email');

  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter(
      lead => 
        lead.name?.toLowerCase().includes(q) || 
        lead.phone?.includes(q) || 
        lead.email?.toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  const leadsMap = useMemo(() => {
    return new Map(leads.map(lead => [lead.id, lead]));
  }, [leads]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => activeChannel === 'whatsapp' ? t.channel === 'whatsapp' : (t.channel !== 'whatsapp'));
  }, [templates, activeChannel]);

  const handleChannelChange = (channel: 'email' | 'whatsapp') => {
    setActiveChannel(channel);
    setSelectedLeadIds([]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const targetable = filteredLeads.filter(l => activeChannel === 'whatsapp' ? l.phone : l.email);
      setSelectedLeadIds(targetable.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(prev => [...prev, id]);
    } else {
      setSelectedLeadIds(prev => prev.filter(x => x !== id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
      case "sending":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Sent</Badge>;
      case "delivered":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Delivered</Badge>;
      case "opened":
        return <Badge className="bg-teal-50 text-teal-700 border-teal-200">Opened</Badge>;
      case "clicked":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Clicked</Badge>;
      case "failed":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getChannelBadge = (channel: 'email' | 'whatsapp') => {
    if (channel === 'whatsapp') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
          <MessageSquare className="h-3 w-3" />
          WhatsApp
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 w-fit">
        <Mail className="h-3 w-3" />
        Email
      </Badge>
    );
  };

  const mergedCampaigns = useMemo(() => {
    const emailList = (campaigns || []).map(c => ({
      ...c,
      channel: 'email' as const,
      recipient: c.provider_response?.to || leadsMap.get(c.lead_id)?.email || "-",
      subjectOrText: c.provider_response?.subject || c.subject || "-",
      sentAt: c.email_sent_at || c.created_at,
      opened: !!(c.email_opened_at || c.opened_at),
      clicked: !!(c.email_clicked_at || c.clicked_at)
    }));

    const whatsappList = (whatsappCampaigns || []).map(c => ({
      ...c,
      channel: 'whatsapp' as const,
      recipient: leadsMap.get(c.lead_id)?.phone || "-",
      subjectOrText: c.message_content || "-",
      sentAt: c.sent_at || c.created_at,
      opened: false,
      clicked: !!(c.clicked_at || c.status === 'clicked')
    }));

    return [...emailList, ...whatsappList].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  }, [campaigns, whatsappCampaigns, leadsMap]);

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm max-w-md">
        <button
          onClick={() => setActiveTab("send")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "send"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Send className="h-4 w-4" />
          Send Campaign
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "history"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <History className="h-4 w-4" />
          History Log
        </button>
      </div>

      {activeTab === "send" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Leads Selection Table */}
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Select Campaign Recipients</h2>
              <p className="text-sm text-slate-500 mt-1">Select the leads you want to target with this campaign</p>

              {/* Channel Selector Toggle */}
              <div className="flex gap-2 mt-4 border-b border-slate-100 pb-4">
                <button
                  type="button"
                  onClick={() => handleChannelChange('email')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    activeChannel === 'email'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email Campaigns
                </button>
                <button
                  type="button"
                  onClick={() => handleChannelChange('whatsapp')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                    activeChannel === 'whatsapp'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  WhatsApp Campaigns
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="p-4 w-12">
                      <input
                        type="checkbox"
                        checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.filter(l => activeChannel === 'whatsapp' ? l.phone : l.email).length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                    </th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className={`hover:bg-slate-50 transition-colors ${
                        selectedLeadIds.includes(lead.id) ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={(e) => handleSelectOne(lead.id, e.target.checked)}
                          disabled={activeChannel === 'whatsapp' ? !lead.phone : !lead.email}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
                        />
                      </td>
                      <td className="p-4 font-semibold text-slate-900">{lead.name}</td>
                      <td className="p-4 text-slate-600">
                        {lead.email ? (
                          lead.email
                        ) : (
                          <span className="text-xs text-red-500 italic">No email</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500">
                        {lead.phone ? (
                          lead.phone
                        ) : (
                          <span className="text-xs text-red-500 italic">No phone</span>
                        )}
                      </td>
                      <td className="p-4 font-medium text-slate-700">{lead.loan_type}</td>
                    </tr>
                  ))}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500">
                        No leads found match your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Campaign Config and Sender */}
          <div className="xl:col-span-5">
            <AgentCampaignSender
              agent={agent}
              selectedLeadIds={selectedLeadIds}
              templates={filteredTemplates}
              activeChannel={activeChannel}
              isTrialExpired={isTrialExpired}
              onSendSuccess={() => setSelectedLeadIds([])}
            />
          </div>
        </div>
      ) : (
        /* History Log Tab */
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Channel</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Campaign Name</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject / Text</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Opened</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clicked</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mergedCampaigns.map((camp) => {
                    const lead = leadsMap.get(camp.lead_id);
                    return (
                      <tr key={camp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          {getChannelBadge(camp.channel)}
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-900">{lead?.name || "Deleted Lead"}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">
                            {camp.recipient}
                          </p>
                        </td>
                        <td className="p-4 font-medium text-slate-700">
                          {camp.template_name || camp.campaign_name}
                        </td>
                        <td className="p-4 text-slate-600 truncate max-w-[220px]" title={camp.subjectOrText}>
                          {camp.subjectOrText}
                        </td>
                        <td className="p-4">{getStatusBadge(camp.status)}</td>
                        <td className="p-4">
                          {camp.channel === 'email' ? (
                            camp.opened ? (
                              <Eye className="h-4 w-4 text-teal-600" />
                            ) : (
                              <span className="text-slate-300">-</span>
                            )
                          ) : (
                            <span className="text-slate-300">-</span> // No open tracking for WhatsApp
                          )}
                        </td>
                        <td className="p-4">
                          {camp.clicked ? (
                            <MousePointerClick className="h-4 w-4 text-purple-600" />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-500">
                          {formatDate(camp.sentAt)}
                        </td>
                      </tr>
                    );
                  })}
                  {mergedCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500">
                        No campaigns have been sent yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

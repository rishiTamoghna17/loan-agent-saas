"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Mail, 
  MessageSquare, 
  Eye, 
  MousePointerClick, 
  Plus, 
  Search, 
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  Filter,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

type CampaignsDashboardClientProps = {
  agent: any;
  leads: any[];
  campaigns: any[]; // email campaigns
  whatsappCampaigns: any[];
};

export function CampaignsDashboardClient({
  agent,
  leads,
  campaigns,
  whatsappCampaigns = []
}: CampaignsDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "email" | "whatsapp">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const leadsMap = useMemo(() => {
    return new Map(leads.map(lead => [lead.id, lead]));
  }, [leads]);

  // Combine and map campaigns
  const mergedCampaigns = useMemo(() => {
    const emailList = (campaigns || []).map(c => ({
      ...c,
      channel: 'email' as const,
      recipientName: leadsMap.get(c.lead_id)?.name || "Deleted Lead",
      recipientContact: c.provider_response?.to || leadsMap.get(c.lead_id)?.email || "-",
      subjectOrText: c.provider_response?.subject || c.subject || "-",
      sentAt: c.email_sent_at || c.created_at,
      opened: !!(c.email_opened_at || c.opened_at),
      clicked: !!(c.email_clicked_at || c.clicked_at),
      displayStatus: c.status || 'sent'
    }));

    const whatsappList = (whatsappCampaigns || []).map(c => ({
      ...c,
      channel: 'whatsapp' as const,
      recipientName: leadsMap.get(c.lead_id)?.name || "Deleted Lead",
      recipientContact: leadsMap.get(c.lead_id)?.phone || "-",
      subjectOrText: c.message_content || "-",
      sentAt: c.sent_at || c.created_at,
      opened: false,
      clicked: !!(c.clicked_at || c.status === 'clicked'),
      displayStatus: c.status || 'sent'
    }));

    return [...emailList, ...whatsappList].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  }, [campaigns, whatsappCampaigns, leadsMap]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return mergedCampaigns.filter(camp => {
      const matchesSearch = 
        camp.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.recipientContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.subjectOrText.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesChannel = channelFilter === "all" || camp.channel === channelFilter;
      
      const matchesStatus = statusFilter === "all" || camp.displayStatus === statusFilter;

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [mergedCampaigns, searchQuery, channelFilter, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const emailSent = campaigns.length;
    const emailOpened = campaigns.filter(c => c.email_opened_at || c.opened_at).length;
    const emailClicked = campaigns.filter(c => c.email_clicked_at || c.clicked_at).length;
    
    const emailOpenRate = emailSent > 0 ? (emailOpened / emailSent) * 100 : 0;
    const emailClickRate = emailSent > 0 ? (emailClicked / emailSent) * 100 : 0;

    const waSent = whatsappCampaigns.length;
    const waClicked = whatsappCampaigns.filter(c => c.clicked_at || c.status === 'clicked').length;
    const waClickRate = waSent > 0 ? (waClicked / waSent) * 100 : 0;

    const totalSent = emailSent + waSent;

    return {
      emailSent,
      emailOpenRate,
      emailClickRate,
      waSent,
      waClickRate,
      totalSent
    };
  }, [campaigns, whatsappCampaigns]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "sent":
      case "sending":
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium px-2 py-0.5">Sent</Badge>;
      case "delivered":
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-medium px-2 py-0.5">Delivered</Badge>;
      case "opened":
        return <Badge className="bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-medium px-2 py-0.5">Opened</Badge>;
      case "clicked":
        return <Badge className="bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-medium px-2 py-0.5">Clicked</Badge>;
      case "failed":
        return <Badge className="bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium px-2 py-0.5">Failed</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium px-2 py-0.5">{status}</Badge>;
    }
  };

  const getChannelBadge = (channel: 'email' | 'whatsapp') => {
    if (channel === 'whatsapp') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold flex items-center gap-1.5 w-fit px-2 py-0.5">
          <MessageSquare className="h-3 w-3" />
          WhatsApp
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold flex items-center gap-1.5 w-fit px-2 py-0.5">
        <Mail className="h-3 w-3" />
        Email
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Title & Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">Design, execute, and track campaigns to engage your leads.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/campaigns/templates">
            <Button variant="outline" className="border-slate-200 hover:bg-slate-50 font-semibold h-11 rounded-xl">
              Templates Gallery
            </Button>
          </Link>
          <Link href="/dashboard/campaigns/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-xl shadow-sm hover:shadow-blue-100 flex items-center gap-2 px-5">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Campaigns */}
        <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Total Sent</span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-slate-900">{stats.totalSent}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span>Across all active channels</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Sent */}
        <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Email Campaigns</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Mail className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-slate-900">{stats.emailSent}</h3>
              <div className="flex gap-4 mt-1.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Open Rate</span>
                  <p className="text-xs font-bold text-slate-700">{stats.emailOpenRate.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">CTR</span>
                  <p className="text-xs font-bold text-slate-700">{stats.emailClickRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Sent */}
        <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">WhatsApp Campaigns</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-slate-900">{stats.waSent}</h3>
              <div className="flex gap-4 mt-1.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Click Rate</span>
                  <p className="text-xs font-bold text-slate-700">{stats.waClickRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Combined Conversion Card */}
        <Card className="border-slate-200/80 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600 text-white overflow-hidden rounded-2xl">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-90">Overall CTR</span>
              <div className="p-2 rounded-xl bg-white/10 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight">
                {stats.totalSent > 0 
                  ? (((campaigns.filter(c => c.email_clicked_at || c.clicked_at).length + 
                       whatsappCampaigns.filter(c => c.clicked_at || c.status === 'clicked').length) / stats.totalSent) * 100).toFixed(1) 
                  : "0.0"}%
              </h3>
              <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <span>Direct link actions tracked</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns History Workspace */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Campaign History Log</h2>
              <p className="text-sm text-slate-500 mt-0.5">Audit log of all sent email and WhatsApp messages.</p>
            </div>
          </div>

          {/* Search and Filters row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by lead name, contact, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {/* Channel Filter */}
              <div className="relative">
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value as any)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl px-4 pr-10 h-11 text-sm font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Channels</option>
                  <option value="email">Email Only</option>
                  <option value="whatsapp">WhatsApp Only</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <Filter className="h-4 w-4" />
                </div>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl px-4 pr-10 h-11 text-sm font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="opened">Opened</option>
                  <option value="clicked">Clicked</option>
                  <option value="failed">Failed</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <Filter className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-4 pl-6 text-xs uppercase tracking-wider">Channel</th>
                <th className="p-4 text-xs uppercase tracking-wider">Recipient</th>
                <th className="p-4 text-xs uppercase tracking-wider">Campaign / Template</th>
                <th className="p-4 text-xs uppercase tracking-wider">Subject / Content Preview</th>
                <th className="p-4 text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs uppercase tracking-wider">Opened</th>
                <th className="p-4 text-xs uppercase tracking-wider">Clicked</th>
                <th className="p-4 pr-6 text-xs uppercase tracking-wider">Date Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCampaigns.map((camp) => {
                return (
                  <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      {getChannelBadge(camp.channel)}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{camp.recipientName}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]" title={camp.recipientContact}>
                        {camp.recipientContact}
                      </p>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {camp.template_name || camp.campaign_name || "Custom Message"}
                    </td>
                    <td className="p-4 text-slate-600 truncate max-w-[240px]" title={camp.subjectOrText}>
                      {camp.subjectOrText}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(camp.displayStatus)}
                    </td>
                    <td className="p-4">
                      {camp.channel === 'email' ? (
                        camp.opened ? (
                          <Eye className="h-4 w-4 text-teal-600" />
                        ) : (
                          <span className="text-slate-300 font-medium">-</span>
                        )
                      ) : (
                        <span className="text-slate-300 font-medium">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {camp.clicked ? (
                        <MousePointerClick className="h-4.5 w-4.5 text-purple-600" />
                      ) : (
                        <span className="text-slate-300 font-medium">-</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-slate-500 whitespace-nowrap">
                      {formatDate(camp.sentAt)}
                    </td>
                  </tr>
                );
              })}
              {filteredCampaigns.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    No campaigns found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

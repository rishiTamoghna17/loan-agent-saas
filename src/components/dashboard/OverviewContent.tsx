import {
  Users,
  UserPlus,
  CalendarCheck,
  TrendingUp,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLeadsMenu } from "@/components/dashboard/add-leads-menu";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WebsiteAlertBanner } from "@/components/dashboard/WebsiteAlertBanner";

type OverviewContentProps = {
  agent: any;
  counts: { total: number; new: number; follow_up: number; closed: number; rejected: number; };
  analytics: any;
  activeFollowUps: any[];
  followUpGroups: any;
  visibleLeads: any[];
  isTrialExpired: boolean;
};

export function OverviewContent({
  agent,
  counts,
  analytics,
  activeFollowUps,
  followUpGroups,
  visibleLeads,
  isTrialExpired
}: OverviewContentProps) {
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  
  const recentLeads = visibleLeads.slice(0, 5);
  
  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {getGreeting()}, {agent.business_name || agent.name}
          </h1>
          <p className="text-slate-500 mt-1">Here’s what’s happening with your leads today</p>
        </div>
        <AddLeadsMenu disabled={isTrialExpired} />
      </div>

      {/* Website Status Alert Banner */}
      <WebsiteAlertBanner agentProfile={agent} />
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total leads</p>
                <p className="text-2xl font-bold text-slate-900">{counts.total}</p>
                <p className="text-xs text-slate-400">All time</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-slate-600" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">New leads</p>
                <p className="text-2xl font-bold text-slate-900">{counts.new}</p>
                <p className="text-xs text-slate-400">This week</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-blue-50 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-blue-600" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Due follow-ups</p>
                <p className="text-2xl font-bold text-slate-900">
                  {followUpGroups.overdue.length + followUpGroups.today.length}
                </p>
                <p className="text-xs text-slate-400">
                  {followUpGroups.overdue.length > 0 ? `${followUpGroups.overdue.length} overdue` : "Nothing due"}
                </p>
              </div>
              <div className="h-11 w-11 rounded-full bg-amber-50 flex items-center justify-center">
                <CalendarCheck className="h-6 w-6 text-amber-600" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Conversion</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.conversion}%</p>
                <p className="text-xs text-slate-400">Last 30 days</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-green-50 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" strokeWidth={1.75} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead Performance Panel (placeholder) */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Lead performance</CardTitle>
              <div className="flex items-center gap-2">
                <button className="text-xs font-semibold text-blue-600">7d</button>
                <button className="text-xs text-slate-500">30d</button>
                <button className="text-xs text-slate-500">90d</button>
              </div>
            </div>
            <p className="text-sm text-slate-500">Last 30 days</p>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <div className="h-48 bg-slate-50 rounded-lg flex items-center justify-center">
              <p className="text-slate-400 text-sm">Trend chart coming soon</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Follow-up summary */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="text-base font-semibold text-slate-900">Follow-up summary</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Overdue</p>
              <p className="text-sm font-semibold text-red-600">{followUpGroups.overdue.length}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Due today</p>
              <p className="text-sm font-semibold text-amber-600">{followUpGroups.today.length}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Upcoming</p>
              <p className="text-sm font-semibold text-slate-700">{followUpGroups.upcoming.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Secondary Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Status Pipeline */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="text-base font-semibold text-slate-900">Lead status pipeline</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">New</p>
              <p className="text-sm font-semibold text-slate-900">{counts.new}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Follow-up</p>
              <p className="text-sm font-semibold text-slate-900">{counts.follow_up}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Closed</p>
              <p className="text-sm font-semibold text-green-600">{counts.closed}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Rejected</p>
              <p className="text-sm font-semibold text-slate-500">{counts.rejected}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Lead Sources */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="text-base font-semibold text-slate-900">Lead sources</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <p className="text-sm text-slate-400">Source breakdown coming soon</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Leads */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-5 pb-0 flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">Recent leads</CardTitle>
          <Link href="/dashboard/leads">
            <Button variant="ghost" className="text-sm text-blue-600 hover:text-blue-700">
              View all leads
              <ChevronRight className="h-4 w-4 ml-1" strokeWidth={1.75} />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-5 pt-4">
          {recentLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-xs font-medium text-slate-500">Name</th>
                    <th className="p-3 text-xs font-medium text-slate-500">Loan</th>
                    <th className="p-3 text-xs font-medium text-slate-500">Amount</th>
                    <th className="p-3 text-xs font-medium text-slate-500">Status</th>
                    <th className="p-3 text-xs font-medium text-slate-500">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLeads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <p className="font-medium text-slate-900">{lead.name}</p>
                      </td>
                      <td className="p-3 text-slate-600">{lead.loan_type}</td>
                      <td className="p-3 font-medium text-slate-900">
                        {Number(lead.required_amount).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-xs">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              No leads yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
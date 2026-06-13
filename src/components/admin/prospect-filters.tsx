"use client";

import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";

export function AdminProspectFilters({
  statusFilter,
  engagementFilter,
  query,
  pageSize,
  sortBy,
  sortDirection,
  view,
  folderId,
}: {
  statusFilter?: string;
  engagementFilter?: string;
  query?: string;
  pageSize: number;
  sortBy: string;
  sortDirection: "asc" | "desc";
  view: string;
  folderId?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <input type="hidden" name="pageSize" value={pageSize} />
          <input type="hidden" name="sortBy" value={sortBy} />
          <input type="hidden" name="sortDirection" value={sortDirection} />
          <input type="hidden" name="view" value={view} />
          {folderId ? <input type="hidden" name="folder" value={folderId} /> : null}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-700">Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Name, email, company..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-xs sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-700">Status</label>
            <Select
              name="status"
              defaultValue={statusFilter}
              placeholder="All Statuses"
            >
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="clicked">Clicked</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="demo_requested">Demo Requested</SelectItem>
              <SelectItem value="trial_started">Trial Started</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </Select>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-700">Engagement</label>
            <Select
              name="engagement"
              defaultValue={engagementFilter}
              placeholder="All Prospects"
            >
              <SelectItem value="">All Prospects</SelectItem>
              <SelectItem value="any">Any Engagement</SelectItem>
              <SelectItem value="sent">Email Sent</SelectItem>
              <SelectItem value="delivered">Email Delivered</SelectItem>
              <SelectItem value="opened">Opened Email</SelectItem>
              <SelectItem value="clicked">Clicked Link</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="failed">Failed or Bounced</SelectItem>
            </Select>
          </div>

          <Button type="submit" className="w-full">
            Apply Filters
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

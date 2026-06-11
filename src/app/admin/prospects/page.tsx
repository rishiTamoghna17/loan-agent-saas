import { ProspectImport } from "@/components/admin/prospect-import";
import { AddProspectForm } from "@/components/admin/add-prospect-form";
import { ProspectsTableManager } from "@/components/admin/prospects-table-manager";
import Link from "next/link";
import { getProspects } from "@/app/admin/actions";
import { 
  Search 
} from "lucide-react";

const engagementOptions = ["sent", "delivered", "opened", "clicked", "replied", "failed", "any"] as const;
const sortOptions = ["created_at", "name", "lead_score", "status", "city"] as const;

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const statusFilter = searchParams.status as string;
  const cityFilter = searchParams.city as string;
  const query = searchParams.q as string;
  const engagementParam = searchParams.engagement as string;
  const engagementFilter = engagementOptions.includes(engagementParam as typeof engagementOptions[number])
    ? engagementParam as typeof engagementOptions[number]
    : undefined;
  const page = parseInt(searchParams.page as string) || 1;
  const requestedPageSize = parseInt(searchParams.pageSize as string) || 20;
  const sortParam = searchParams.sortBy as string;
  const sortBy = sortOptions.includes(sortParam as typeof sortOptions[number])
    ? sortParam as typeof sortOptions[number]
    : "lead_score";
  const sortDirection = searchParams.sortDirection === "asc" ? "asc" : "desc";
  const view = searchParams.view === "archived" || searchParams.view === "deleted" ? searchParams.view : "active";

  const { 
    prospects, 
    count, 
    totalPages,
    pageSize,
    currentPage
  } = await getProspects({
    page,
    pageSize: requestedPageSize,
    status: statusFilter,
    city: cityFilter,
    query,
    engagement: engagementFilter,
    sortBy,
    sortDirection,
    view
  });

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-ink">Prospects</h1>
          <p className="text-slate-500">Manage and track your potential customers.</p>
        </div>
        <div className="flex items-center gap-3">
          {count !== null && (
            <div className="mr-4 text-sm font-medium text-slate-500">
              Total: <span className="text-ink">{count}</span>
            </div>
          )}
          <AddProspectForm />
        </div>
      </div>
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {(["active", "archived", "deleted"] as const).map((item) => (
          <Link key={item} href={`/admin/prospects?view=${item}`} className={`border-b-2 px-4 py-2 text-sm font-semibold capitalize ${view === item ? "border-brand-blue text-brand-blue" : "border-transparent text-slate-500"}`}>
            {item}
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ProspectImport />
          
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Filters</h2>
            <form className="space-y-4">
              <input type="hidden" name="pageSize" value={pageSize} />
              <input type="hidden" name="sortBy" value={sortBy} />
              <input type="hidden" name="sortDirection" value={sortDirection} />
              <input type="hidden" name="view" value={view} />
              <div>
                <label className="text-sm font-medium text-slate-700">Search</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={query}
                    placeholder="Name, email, company..."
                    className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="opened">Opened</option>
                  <option value="clicked">Clicked</option>
                  <option value="replied">Replied</option>
                  <option value="demo_requested">Demo Requested</option>
                  <option value="trial_started">Trial Started</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Engagement</label>
                <select
                  name="engagement"
                  defaultValue={engagementFilter}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">All Prospects</option>
                  <option value="any">Any Engagement</option>
                  <option value="sent">Email Sent</option>
                  <option value="delivered">Email Delivered</option>
                  <option value="opened">Opened Email</option>
                  <option value="clicked">Clicked Link</option>
                  <option value="replied">Replied</option>
                  <option value="failed">Failed or Bounced</option>
                </select>
              </div>

              <button type="submit" className="btn-primary w-full">
                Apply Filters
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <ProspectsTableManager
            prospects={prospects}
            from={from}
            to={to}
            count={count}
            totalPages={totalPages}
            currentPage={currentPage}
            pageSize={pageSize}
            sortBy={sortBy}
            sortDirection={sortDirection}
            showDelete={view === "active"}
            view={view}
          />
        </div>
      </div>
    </div>
  );
}

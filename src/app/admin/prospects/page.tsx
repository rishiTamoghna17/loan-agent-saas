import { ProspectImport } from "@/components/admin/prospect-import";
import { AddProspectForm } from "@/components/admin/add-prospect-form";
import { getProspects } from "@/app/admin/actions";
import Link from "next/link";
import { 
  Search, 
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const statusFilter = searchParams.status as string;
  const cityFilter = searchParams.city as string;
  const query = searchParams.q as string;
  const page = parseInt(searchParams.page as string) || 1;

  const { 
    prospects, 
    count, 
    totalPages,
    pageSize
  } = await getProspects({
    page,
    status: statusFilter,
    city: cityFilter,
    query
  });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const getScoreBadgeColor = (score: number) => {
    if (score >= 100) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (score >= 60) return "bg-orange-100 text-orange-700 border-orange-200";
    if (score >= 30) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 100) return "Customer";
    if (score >= 60) return "Hot";
    if (score >= 30) return "Warm";
    return "Cold";
  };

  const buildQueryString = (params: Record<string, any>) => {
    const newParams = { ...searchParams, ...params };
    const search = new URLSearchParams();
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) search.set(key, String(value));
    });
    return search.toString();
  };

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

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ProspectImport />
          
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Filters</h2>
            <form className="space-y-4">
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
                </select>
              </div>

              <button type="submit" className="btn-primary w-full">
                Apply Filters
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase text-slate-500 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center bg-slate-50">#</th>
                    <th className="px-6 py-4 bg-slate-50">Prospect</th>
                    <th className="px-6 py-4 bg-slate-50">Score</th>
                    <th className="px-6 py-4 bg-slate-50">Status</th>
                    <th className="px-6 py-4 bg-slate-50">Location</th>
                    <th className="px-6 py-4 bg-slate-50">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prospects?.map((prospect, index) => (
                    <tr key={prospect.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">
                        {from + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink">{prospect.name}</div>
                        <div className="text-xs text-slate-500">{prospect.company_name}</div>
                        <div className="mt-1 flex flex-col gap-1 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {prospect.email}
                          </div>
                          {prospect.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              {prospect.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getScoreBadgeColor(prospect.lead_score || 0)}`}>
                          {prospect.lead_score || 0} - {getScoreLabel(prospect.lead_score || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-slate-600">{prospect.status?.replace("_", " ")}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {prospect.city}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!prospects || prospects.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No prospects found. Import some to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 mt-auto">
                <div className="text-xs font-medium text-slate-500">
                  Showing <span className="text-ink">{from + 1}</span> to <span className="text-ink">{Math.min(to + 1, count || 0)}</span> of <span className="text-ink">{count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/prospects?${buildQueryString({ page: page - 1 })}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                  <div className="text-xs font-semibold text-slate-600">
                    Page {page} of {totalPages}
                  </div>
                  <Link
                    href={`/admin/prospects?${buildQueryString({ page: page + 1 })}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

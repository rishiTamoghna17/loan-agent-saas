import { createClient } from "@/lib/supabase/server";
import { ensureAdmin } from "@/app/admin/actions";
import { ProspectImport } from "@/components/admin/prospect-import";
import { 
  Search, 
  Filter, 
  MoreHorizontal,
  Mail,
  Linkedin,
  Globe,
  MapPin,
  Badge
} from "lucide-react";

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  await ensureAdmin();
  const supabase = createClient();
  
  const statusFilter = searchParams.status as string;
  const cityFilter = searchParams.city as string;
  const query = searchParams.q as string;

  let dbQuery = supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter) dbQuery = dbQuery.eq("status", statusFilter);
  if (cityFilter) dbQuery = dbQuery.eq("city", cityFilter);
  if (query) dbQuery = dbQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`);

  const { data: prospects, error } = await dbQuery;

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

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-ink">Prospects</h1>
          <p className="text-slate-500">Manage and track your potential customers.</p>
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

              <button type="submit" className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
                Apply Filters
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Prospect</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prospects?.map((prospect) => (
                    <tr key={prospect.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink">{prospect.name}</div>
                        <div className="text-xs text-slate-500">{prospect.company_name}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                          <Mail className="h-3 w-3" />
                          {prospect.email}
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
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No prospects found. Import some to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

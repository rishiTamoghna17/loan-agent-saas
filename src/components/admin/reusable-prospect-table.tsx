"use client";

import { useState } from "react";
import { ProspectDeleteButton } from "./prospect-delete-button";
import { 
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  MousePointerClick,
  MessageSquare,
  Send,
  Search,
  ArrowDown,
  ArrowUp,
  ArrowUpDown
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

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

const statusIcons = {
  sent: Send,
  delivered: CheckCircle2,
  opened: Eye,
  clicked: MousePointerClick,
  replied: MessageSquare,
  failed: AlertCircle
};

interface ReusableProspectTableProps {
  prospects: any[];
  from?: number;
  to?: number;
  count?: number | null;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  showCheckboxes?: boolean;
  selectedIds?: string[];
  onSelectIds?: (ids: string[]) => void;
  showDelete?: boolean;
  enableRowClick?: boolean;
  enableSearch?: boolean;
}

export function ReusableProspectTable({ 
  prospects, 
  from = 0,
  to,
  count,
  totalPages,
  currentPage = 1,
  pageSize = 20,
  sortBy,
  sortDirection = "desc",
  showCheckboxes = false,
  selectedIds = [],
  onSelectIds,
  showDelete = false,
  enableRowClick = true,
  enableSearch = false
}: ReusableProspectTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState("");

  const filteredProspects = enableSearch 
    ? prospects.filter(p => 
        p.name?.toLowerCase().includes(query.toLowerCase()) || 
        p.email?.toLowerCase().includes(query.toLowerCase()) ||
        p.company_name?.toLowerCase().includes(query.toLowerCase())
      )
    : prospects;

  const toggleSelect = (id: string) => {
    if (!onSelectIds) return;
    onSelectIds(
      selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]
    );
  };

  const toggleAll = () => {
    if (!onSelectIds) return;
    if (selectedIds.length === filteredProspects.length) {
      onSelectIds([]);
    } else {
      onSelectIds(filteredProspects.map(p => p.id));
    }
  };

  const handleRowClick = (id: string) => {
    if (!enableRowClick) return;
    window.location.href = `/admin/prospects/${id}`;
  };

  const buildQueryString = (params: any) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    });
    return newParams.toString();
  };

  const navigateWithQuery = (params: Record<string, string | number | undefined>) => {
    router.push(`${pathname}?${buildQueryString(params)}`);
  };

  const sortableHeader = (label: string, field: string) => {
    if (!sortBy) {
      return <span>{label}</span>;
    }

    const isActive = sortBy === field;
    const Icon = isActive ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
      <button
        type="button"
        onClick={() => navigateWithQuery({
          sortBy: field,
          sortDirection: isActive && sortDirection === "asc" ? "desc" : "asc",
          page: 1
        })}
        className="inline-flex items-center gap-1.5 transition hover:text-brand-blue focus:outline-none focus:text-brand-blue"
        title={`Sort by ${label}`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${isActive ? "text-brand-blue" : "text-slate-300"}`} />
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {enableSearch && (
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search prospects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-brand-blue focus:outline-none"
            />
          </div>
          {showCheckboxes && (
            <div className="text-sm font-medium text-slate-500">
              {selectedIds.length} selected
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase text-slate-500 shadow-sm">
              <tr>
                {showCheckboxes && (
                  <th className="px-6 py-4 bg-slate-50 w-12">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredProspects.length && filteredProspects.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                    />
                  </th>
                )}
                <th className="px-6 py-4 w-12 text-center bg-slate-50">#</th>
                <th className="px-6 py-4 bg-slate-50">{sortableHeader("Prospect", "name")}</th>
                <th className="px-6 py-4 bg-slate-50">{sortableHeader("Score", "lead_score")}</th>
                <th className="px-6 py-4 bg-slate-50">{sortableHeader("Status", "status")}</th>
                <th className="px-6 py-4 bg-slate-50">{sortableHeader("Location", "city")}</th>
                <th className="px-6 py-4 bg-slate-50">Email History</th>
                {showDelete && (
                  <th className="px-6 py-4 bg-slate-50">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProspects.map((prospect, index) => (
                <tr 
                  key={prospect.id} 
                  className={`hover:bg-slate-50/50 cursor-pointer ${selectedIds.includes(prospect.id) ? "bg-blue-50/50" : ""}`}
                  onClick={() => handleRowClick(prospect.id)}
                >
                  {showCheckboxes && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(prospect.id)}
                        onChange={() => toggleSelect(prospect.id)}
                        className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                      />
                    </td>
                  )}
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
                    {prospect.emailHistory && prospect.emailHistory.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {prospect.emailHistory.slice(0, 2).map((email: any, i: number) => {
                          const Icon = statusIcons[email.status as keyof typeof statusIcons] || null;
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                              {Icon && <Icon className="h-3 w-3 text-slate-400" />}
                              <span className="truncate max-w-[120px]">{email.template_name || "Campaign"}</span>
                            </div>
                          );
                        })}
                        {prospect.emailHistory.length > 2 && (
                          <span className="text-xs text-slate-400">+{prospect.emailHistory.length - 2} more</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No emails</span>
                    )}
                  </td>
                  {showDelete && (
                    <td className="px-6 py-4">
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProspectDeleteButton prospectId={prospect.id} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {(!filteredProspects || filteredProspects.length === 0) && (
                <tr>
                  <td 
                    colSpan={showCheckboxes ? 7 : 6} 
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No prospects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {typeof count === "number" && typeof totalPages === "number" && (
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between mt-auto">
            <div className="text-xs font-medium text-slate-500">
              Showing <span className="text-ink">{count > 0 ? from + 1 : 0}</span> to <span className="text-ink">{Math.min((to || 0) + 1, count)}</span> of <span className="text-ink">{count}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                Rows
                <select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(event) => navigateWithQuery({ pageSize: event.target.value, page: 1 })}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none"
                >
                  {[10, 20, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
              <a
                href={`${pathname}?${buildQueryString({ page: currentPage - 1 })}`}
                aria-label="Previous page"
                className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 ${currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </a>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                Page
                <select
                  aria-label="Page number"
                  value={totalPages > 0 ? currentPage : 0}
                  disabled={totalPages === 0}
                  onChange={(event) => navigateWithQuery({ page: event.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none disabled:opacity-50"
                >
                  {totalPages === 0 ? <option value={0}>0</option> : null}
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <option key={pageNumber} value={pageNumber}>{pageNumber}</option>
                  ))}
                </select>
                <span>of {totalPages}</span>
              </label>
              <a
                href={`${pathname}?${buildQueryString({ page: currentPage + 1 })}`}
                aria-label="Next page"
                className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
              >
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

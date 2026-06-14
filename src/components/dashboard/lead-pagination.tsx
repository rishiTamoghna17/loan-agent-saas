"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function LeadPagination({ page, pageSize, count, query }: { page: number; pageSize: number; count: number; query: Record<string, string> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, count);
  
  const href = (nextPage: number, nextSize = pageSize) => {
    const params = new URLSearchParams(query);
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextSize));
    return `/dashboard?${params.toString()}`;
  };

  const handlePageSizeChange = (newSize: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("pageSize", newSize);
    params.set("page", "1"); // Reset to first page when page size changes
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Desktop: Show full text */}
      <span className="text-slate-500 hidden sm:inline">
        {count} matching leads · Page {page} of {totalPages}
      </span>
      {/* Mobile: Simplified text */}
      <span className="text-slate-500 sm:hidden">
        Showing {start}–{end} of {count}
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        <Link href={href(Math.max(1, page - 1))} className={`btn-secondary ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}>Previous</Link>
        {/* Only show page size selector if more than default fits */}
        {count > pageSize ? (
          <select 
            value={pageSize}
            onChange={(e) => handlePageSizeChange(e.target.value)} 
            className="field" 
            aria-label="Leads per page"
          >
            {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} rows</option>)}
          </select>
        ) : null}
        <Link href={href(Math.min(totalPages, page + 1))} className={`btn-secondary ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}>Next</Link>
      </div>
    </div>
  );
}

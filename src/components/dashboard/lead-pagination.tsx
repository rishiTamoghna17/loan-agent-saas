import Link from "next/link";

export function LeadPagination({ page, pageSize, count, query }: { page: number; pageSize: number; count: number; query: Record<string, string> }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const href = (nextPage: number, nextSize = pageSize) => {
    const params = new URLSearchParams(query);
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextSize));
    return `/dashboard?${params.toString()}`;
  };
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-slate-500">{count} matching leads · Page {page} of {totalPages}</span>
      <div className="flex items-center gap-2">
        <Link href={href(Math.max(1, page - 1))} className={`btn-secondary ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}>Previous</Link>
        <form>
          {Object.entries(query).filter(([key]) => !["page", "pageSize"].includes(key)).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
          <select name="pageSize" defaultValue={pageSize} className="field" aria-label="Leads per page">
            {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} rows</option>)}
          </select>
          <button className="btn-secondary mt-2 w-full">Apply</button>
        </form>
        <Link href={href(Math.min(totalPages, page + 1))} className={`btn-secondary ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}>Next</Link>
      </div>
    </div>
  );
}

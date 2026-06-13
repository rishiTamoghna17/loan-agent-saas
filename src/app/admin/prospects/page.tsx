import { ProspectImport } from "@/components/admin/prospect-import";
import { AddProspectForm } from "@/components/admin/add-prospect-form";
import { ProspectsTableManager } from "@/components/admin/prospects-table-manager";
import Link from "next/link";
import { getProspectFolders, getProspects } from "@/app/admin/actions";
import { ProspectFolderBrowser } from "@/components/admin/prospect-folder-browser";
import { Card } from "@/components/ui/card";
import { AdminProspectFilters } from "@/components/admin/prospect-filters";

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
  const folderId = typeof searchParams.folder === "string" ? searchParams.folder : undefined;

  const [{
    prospects,
    count,
    totalPages,
    pageSize,
    currentPage
  }, folders] = await Promise.all([getProspects({
    page,
    pageSize: requestedPageSize,
    status: statusFilter,
    city: cityFilter,
    query,
    engagement: engagementFilter,
    sortBy,
    sortDirection,
    view,
    folderId
  }), getProspectFolders()]);
  const activeFolder = folders.find((folder) => folder.id === folderId);
  const activeFolderName = folderId === "unfiled" ? "Unfiled" : activeFolder?.name;

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Prospects</h1>
            <p className="text-slate-500 text-sm">Manage and track your potential customers.</p>
          </div>
          <div className="flex items-center gap-3">
            {count !== null && (
              <div className="mr-4 text-sm font-medium text-slate-500">
                Total: <span className="text-slate-900">{count}</span>
              </div>
            )}
            <AddProspectForm folderId={folderId} />
          </div>
        </div>

        <div className="mb-6 flex gap-1 border-b border-slate-200 overflow-x-auto pb-0.5">
          {(["active", "archived", "deleted"] as const).map((item) => (
            <Link
              key={item}
              href={`/admin/prospects?view=${item}${folderId ? `&folder=${folderId}` : ""}`}
              className={`border-b-2 px-3 py-2 text-xs sm:text-sm font-semibold capitalize transition-colors whitespace-nowrap ${view === item ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="space-y-6 lg:grid lg:gap-8 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <ProspectFolderBrowser folders={folders} activeFolderId={folderId} />
            <ProspectImport folderId={folderId} />
            <AdminProspectFilters
              statusFilter={statusFilter}
              engagementFilter={engagementFilter}
              query={query}
              pageSize={pageSize}
              sortBy={sortBy}
              sortDirection={sortDirection}
              view={view}
              folderId={folderId}
            />
          </div>

          {/* Prospects Table */}
          <div className="lg:col-span-2">
            {activeFolderName ? (
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                Showing folder: <span className="font-semibold text-slate-900">{activeFolderName}</span>
              </div>
            ) : null}
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
              folders={folders}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

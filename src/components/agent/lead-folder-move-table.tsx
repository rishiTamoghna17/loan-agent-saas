import { FolderInput } from "lucide-react";
import { moveSelectedLeadsToFolder } from "@/app/dashboard/actions";
import type { LeadFolder } from "@/components/agent/lead-folder-browser";
import { PendingButton } from "@/components/ui/pending-button";

export function LeadFolderMoveTable({
  folders,
  disabled
}: {
  folders: LeadFolder[];
  disabled: boolean;
}) {
  return (
    <form id="move-leads-form" action={moveSelectedLeadsToFolder} className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center">
      <span className="text-sm font-semibold text-slate-700">Select leads below, then choose a folder</span>
      <select name="folder_id" aria-label="Destination folder" className="field w-full sm:w-auto" disabled={disabled}>
        <option value="">Move to Unfiled</option>
        {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
      </select>
      <PendingButton className="btn-secondary sm:ml-auto" pendingText="Moving..." disabled={disabled}>
        <FolderInput className="h-4 w-4" />
        Move selected
      </PendingButton>
    </form>
  );
}

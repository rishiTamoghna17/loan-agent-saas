"use client";

import { useState, useTransition } from "react";
import { Archive, Download, FolderInput, RotateCcw, Trash2 } from "lucide-react";
import { bulkProspectAction, moveProspectsToFolder } from "@/app/admin/actions";
import { ReusableProspectTable } from "./reusable-prospect-table";
import type { ProspectFolder } from "./prospect-folder-browser";

export function ProspectsTableManager(props: React.ComponentProps<typeof ReusableProspectTable> & { view: "active" | "archived" | "deleted"; folders: ProspectFolder[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("contacted");
  const [message, setMessage] = useState("");
  const [folderId, setFolderId] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (action: "status" | "archive" | "delete" | "restore_archive" | "restore_delete") => {
    if (!selectedIds.length) return;
    if ((action === "archive" || action === "delete") && !window.confirm(`Apply ${action} to ${selectedIds.length} selected prospects?`)) return;
    startTransition(async () => {
      const result = await bulkProspectAction({ ids: selectedIds, action, status });
      setMessage(result.success ? `${result.count} prospects updated.` : result.error ?? "Could not update prospects.");
      if (result.success) setSelectedIds([]);
    });
  };

  const moveSelected = () => {
    if (!selectedIds.length) return;
    startTransition(async () => {
      const result = await moveProspectsToFolder(selectedIds, folderId || undefined);
      setMessage(result.success ? `${result.count} prospects moved.` : result.error ?? "Could not move prospects.");
      if (result.success) setSelectedIds([]);
    });
  };

  const exportSelected = async () => {
    if (!selectedIds.length) return;
    const response = await fetch("/api/admin/prospects/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });
    if (!response.ok) return setMessage("Could not export selected prospects.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leadhub-selected-prospects.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-semibold text-slate-700">{selectedIds.length} selected</span>
          {props.view === "active" ? (
            <>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="field w-auto" disabled={pending}>
                {["new", "contacted", "opened", "clicked", "replied", "demo_requested", "trial_started", "converted", "lost"].map((item) => (
                  <option key={item} value={item}>{item.replace("_", " ")}</option>
                ))}
              </select>
              <button className="btn-secondary" disabled={pending || !selectedIds.length} onClick={() => run("status")}>Change status</button>
              <button className="btn-secondary" disabled={pending || !selectedIds.length} onClick={() => run("archive")}><Archive className="h-4 w-4" />Archive</button>
              <button className="btn-secondary text-red-600" disabled={pending || !selectedIds.length} onClick={() => run("delete")}><Trash2 className="h-4 w-4" />Delete</button>
              <select aria-label="Destination folder" value={folderId} onChange={(event) => setFolderId(event.target.value)} className="field w-auto" disabled={pending}>
                <option value="">Top level</option>
                {props.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
              </select>
              <button className="btn-secondary" disabled={pending || !selectedIds.length} onClick={moveSelected}><FolderInput className="h-4 w-4" />Move</button>
            </>
          ) : (
            <button className="btn-secondary" disabled={pending || !selectedIds.length} onClick={() => run(props.view === "archived" ? "restore_archive" : "restore_delete")}>
              <RotateCcw className="h-4 w-4" />Restore
            </button>
          )}
          <button className="btn-secondary" disabled={pending || !selectedIds.length} onClick={exportSelected}><Download className="h-4 w-4" />Export selected</button>
        </div>
        {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
      </div>
      <ReusableProspectTable {...props} showCheckboxes selectedIds={selectedIds} onSelectIds={setSelectedIds} />
    </div>
  );
}

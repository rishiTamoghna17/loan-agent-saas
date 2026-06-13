"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight, Folder, FolderOpen, FolderPlus, Pencil, Trash2, Users, Archive, RotateCcw } from "lucide-react";
import { createLeadFolder, deleteLeadFolder, renameLeadFolder, archiveLeadFolder, restoreLeadFolder } from "@/app/dashboard/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type LeadFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  lead_count: number;
};

function buildTree(folders: LeadFolder[], parentId: string | null, depth = 0): Array<LeadFolder & { depth: number }> {
  return folders
    .filter((folder) => folder.parent_id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((folder) => [{ ...folder, depth }, ...buildTree(folders, folder.id, depth + 1)]);
}

export function LeadFolderBrowser({
  folders,
  activeFolderId
}: {
  folders: LeadFolder[];
  activeFolderId?: string;
}) {
  const searchParams = useSearchParams();
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const tree = buildTree(folders, null);

  const folderHref = (folderId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (folderId) params.set("folder", folderId);
    else params.delete("folder");
    return `/dashboard?${params.toString()}`;
  };

  const createFolder = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createLeadFolder(newName, activeFolderId);
      setMessage(result.success ? "Folder created." : result.error ?? "Could not create folder.");
      if (result.success) setNewName("");
    });
  };

  const renameFolder = (folder: LeadFolder) => {
    const name = window.prompt("Rename folder", folder.name);
    if (!name || name.trim() === folder.name) return;
    startTransition(async () => {
      const result = await renameLeadFolder(folder.id, name);
      setMessage(result.success ? "Folder renamed." : result.error ?? "Could not rename folder.");
    });
  };

  const removeFolder = (folder: LeadFolder) => {
    if (!window.confirm(`Delete "${folder.name}"? Leads and subfolders will be moved to the top level.`)) return;
    startTransition(async () => {
      const result = await deleteLeadFolder(folder.id);
      setMessage(result.success ? "Folder deleted." : result.error ?? "Could not delete folder.");
      if (result.success && activeFolderId === folder.id) window.location.href = "/dashboard";
    });
  };

  const archiveFolderFunc = (folder: LeadFolder) => {
    if (!window.confirm(`Archive "${folder.name}"? All leads in this folder and subfolders will be archived.`)) return;
    startTransition(async () => {
      const result = await archiveLeadFolder(folder.id);
      setMessage(result.success ? `Archived ${result.count} leads.` : result.error ?? "Could not archive folder.");
    });
  };

  const restoreFolderFunc = (folder: LeadFolder) => {
    if (!window.confirm(`Restore "${folder.name}"? All leads in this folder and subfolders will be restored from archive.`)) return;
    startTransition(async () => {
      const result = await restoreLeadFolder(folder.id);
      setMessage(result.success ? `Restored ${result.count} leads.` : result.error ?? "Could not restore folder.");
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <FolderOpen className="h-[18px] w-[18px] shrink-0 mt-0.5 text-slate-500" strokeWidth={1.75} />
          <div>
            <CardTitle className="leading-[24px]">Lead folders</CardTitle>
            <CardDescription className="leading-[20px]">Organize your leads</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <Link href={folderHref()} className={`flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-xl text-sm transition-colors ${!activeFolderId ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
            <Users className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 min-w-0 truncate">All leads</span>
          </Link>
          <Link href={folderHref("unfiled")} className={`flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-xl text-sm transition-colors ${activeFolderId === "unfiled" ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
            <FolderOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 min-w-0 truncate">Unfiled</span>
          </Link>
          {tree.map((folder) => {
            const active = activeFolderId === folder.id;
            const isArchived = !!folder.archived_at;
            return (
              <div key={folder.id} className={`group flex items-center min-h-[40px] rounded-xl transition-colors ${active ? "bg-blue-50" : "hover:bg-slate-50"} ${isArchived ? "opacity-60" : ""}`} style={{ paddingLeft: `${folder.depth * 14 + 12}px` }}>
                <Link href={folderHref(folder.id)} className={`flex items-center gap-2 min-w-0 flex-1 px-3 py-2 text-sm ${active ? "font-semibold text-blue-700" : "text-slate-600"}`}>
                  {folder.depth > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} /> : null}
                  <Folder className="h-4 w-4 shrink-0 text-amber-500" strokeWidth={1.75} />
                  <span className="flex-1 min-w-0 truncate">{folder.name}</span>
                  {isArchived ? (
                    <span className="shrink-0 text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">Archived</span>
                  ) : null}
                  <span className="shrink-0 text-xs text-slate-400 tabular-nums">{folder.lead_count}</span>
                </Link>
                <button type="button" title="Rename folder" onClick={() => renameFolder(folder)} className="p-1.5 text-slate-400 hover:text-blue-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" disabled={pending}>
                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                </button>
                {isArchived ? (
                  <button type="button" title="Restore folder" onClick={() => restoreFolderFunc(folder)} className="p-1.5 text-slate-400 hover:text-green-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" disabled={pending}>
                    <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                ) : (
                  <button type="button" title="Archive folder" onClick={() => archiveFolderFunc(folder)} className="p-1.5 text-slate-400 hover:text-amber-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" disabled={pending}>
                    <Archive className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                )}
                <button type="button" title="Delete folder" onClick={() => removeFolder(folder)} className="mr-1 p-1.5 text-slate-400 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" disabled={pending}>
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && createFolder()}
            placeholder={activeFolderId && activeFolderId !== "unfiled" ? "New subfolder" : "New folder"}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={pending}
          />
          <Button
            type="button"
            size="icon"
            className="h-10 w-10"
            onClick={createFolder}
            disabled={pending || !newName.trim()}
            aria-label="Create folder"
          >
            <FolderPlus className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
        {message ? <p className="mt-3 text-xs text-slate-500">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

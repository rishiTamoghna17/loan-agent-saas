"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight, Folder, FolderOpen, FolderPlus, Pencil, Trash2, Users } from "lucide-react";
import { createProspectFolder, deleteProspectFolder, renameProspectFolder } from "@/app/admin/actions";

export type ProspectFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  prospect_count: number;
};

function buildTree(folders: ProspectFolder[], parentId: string | null, depth = 0): Array<ProspectFolder & { depth: number }> {
  return folders
    .filter((folder) => folder.parent_id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((folder) => [{ ...folder, depth }, ...buildTree(folders, folder.id, depth + 1)]);
}

export function ProspectFolderBrowser({
  folders,
  activeFolderId
}: {
  folders: ProspectFolder[];
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
    return `/admin/prospects?${params.toString()}`;
  };

  const createFolder = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createProspectFolder(newName, activeFolderId);
      setMessage(result.success ? "Folder created." : result.error ?? "Could not create folder.");
      if (result.success) setNewName("");
    });
  };

  const renameFolder = (folder: ProspectFolder) => {
    const name = window.prompt("Rename folder", folder.name);
    if (!name || name.trim() === folder.name) return;
    startTransition(async () => {
      const result = await renameProspectFolder(folder.id, name);
      setMessage(result.success ? "Folder renamed." : result.error ?? "Could not rename folder.");
    });
  };

  const removeFolder = (folder: ProspectFolder) => {
    if (!window.confirm(`Delete "${folder.name}"? Prospects and subfolders will be moved to the top level.`)) return;
    startTransition(async () => {
      const result = await deleteProspectFolder(folder.id);
      setMessage(result.success ? "Folder deleted." : result.error ?? "Could not delete folder.");
      if (result.success && activeFolderId === folder.id) window.location.href = "/admin/prospects";
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink">Prospect folders</h2>
          <p className="text-xs text-slate-500">Organize prospects like Drive.</p>
        </div>
        <FolderOpen className="h-5 w-5 text-brand-blue" />
      </div>

      <div className="space-y-1">
        <Link href={folderHref()} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${!activeFolderId ? "bg-blue-50 font-semibold text-brand-blue" : "text-slate-600 hover:bg-slate-50"}`}>
          <Users className="h-4 w-4" />
          All prospects
        </Link>
        <Link href={folderHref("unfiled")} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${activeFolderId === "unfiled" ? "bg-blue-50 font-semibold text-brand-blue" : "text-slate-600 hover:bg-slate-50"}`}>
          <FolderOpen className="h-4 w-4" />
          Unfiled
        </Link>
        {tree.map((folder) => {
          const active = activeFolderId === folder.id;
          return (
            <div key={folder.id} className={`group flex items-center rounded-lg ${active ? "bg-blue-50" : "hover:bg-slate-50"}`} style={{ paddingLeft: `${folder.depth * 14}px` }}>
              <Link href={folderHref(folder.id)} className={`flex min-w-0 flex-1 items-center gap-1.5 px-2 py-2 text-sm ${active ? "font-semibold text-brand-blue" : "text-slate-600"}`}>
                {folder.depth > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" /> : null}
                <Folder className="h-4 w-4 shrink-0 fill-current text-amber-400" />
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-xs text-slate-400">{folder.prospect_count}</span>
              </Link>
              <button type="button" title="Rename folder" onClick={() => renameFolder(folder)} className="p-1 text-slate-300 hover:text-brand-blue sm:opacity-0 sm:group-hover:opacity-100" disabled={pending}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Delete folder" onClick={() => removeFolder(folder)} className="mr-1 p-1 text-slate-300 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100" disabled={pending}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
        <input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createFolder()} placeholder={activeFolderId && activeFolderId !== "unfiled" ? "New subfolder" : "New folder"} className="field min-w-0 flex-1" disabled={pending} />
        <button type="button" title="Create folder" onClick={createFolder} className="btn-secondary px-3" disabled={pending || !newName.trim()}>
          <FolderPlus className="h-4 w-4" />
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}

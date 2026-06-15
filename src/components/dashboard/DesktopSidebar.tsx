"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { 
  Home, 
  Users, 
  CalendarCheck, 
  UploadCloud, 
  UserRound, 
  Settings, 
  LogOut,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Folder,
  Plus,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Mail,
  Loader2,
  Sparkles,
  Globe
} from "lucide-react";
import { LeadHubMark } from "@/components/brand/lead-hub-mark";
import { logout } from "@/app/auth/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useTransition, useRef } from "react";
import { getFolderName } from "@/lib/utils";
import { AddLeadsMenu } from "@/components/dashboard/add-leads-menu";
import { 
  createLeadFolder, 
  deleteLeadFolder, 
  renameLeadFolder, 
  archiveLeadFolder, 
  restoreLeadFolder 
} from "@/app/dashboard/actions";

type DesktopSidebarProps = {
  agent: { id: string; name: string; business_name: string | null; slug?: string; };
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  folders: any[];
  folderId: string | undefined;
};

export function DesktopSidebar({ 
  agent, 
  trialDaysRemaining, 
  isTrialExpired,
  folders,
  folderId
}: DesktopSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Folder Modals states
  const [modalType, setModalType] = useState<"create" | "rename" | "delete" | "archive" | "restore" | null>(null);
  const [activeFolder, setActiveFolder] = useState<any>(null);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [areFoldersExpanded, setAreFoldersExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("leadhub-folders-expanded");
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });
  
  useEffect(() => {
    localStorage.setItem("leadhub-folders-expanded", JSON.stringify(areFoldersExpanded));
  }, [areFoldersExpanded]);

  const [areCampaignsExpanded, setAreCampaignsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("leadhub-campaigns-expanded");
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem("leadhub-campaigns-expanded", JSON.stringify(areCampaignsExpanded));
  }, [areCampaignsExpanded]);
  
  const navItems = [
    { label: "Overview", href: "/dashboard", icon: Home },
    { label: "Agent Desk", href: "/dashboard/agent", icon: Sparkles },
    { label: "Follow-ups", href: "/dashboard/follow-ups", icon: CalendarCheck },
    { label: "Website Wizard", href: "/dashboard/website", icon: Globe },
    { label: "Import data", href: "/dashboard/leads?import=true", icon: UploadCloud },
  ];

  const handleModalConfirm = () => {
    setErrorMessage("");
    if (modalType === "create") {
      const name = folderNameInput.trim();
      if (!name) return;
      startTransition(async () => {
        const result = await createLeadFolder(name);
        if (!result.success) {
          setErrorMessage(result.error ?? "Could not create folder.");
        } else {
          setModalType(null);
          setFolderNameInput("");
          router.refresh();
        }
      });
    } else if (modalType === "rename") {
      const name = folderNameInput.trim();
      if (!name || name === activeFolder.name) return;
      startTransition(async () => {
        const result = await renameLeadFolder(activeFolder.id, name);
        if (!result.success) {
          setErrorMessage(result.error ?? "Could not rename folder.");
        } else {
          setModalType(null);
          setFolderNameInput("");
          router.refresh();
        }
      });
    } else if (modalType === "delete") {
      startTransition(async () => {
        const result = await deleteLeadFolder(activeFolder.id);
        if (!result.success) {
          setErrorMessage(result.error ?? "Could not delete folder.");
        } else {
          setModalType(null);
          if (folderId === activeFolder.id) {
            router.push("/dashboard/leads");
          } else {
            router.refresh();
          }
        }
      });
    } else if (modalType === "archive") {
      startTransition(async () => {
        const result = await archiveLeadFolder(activeFolder.id);
        if (!result.success) {
          setErrorMessage(result.error ?? "Could not archive folder.");
        } else {
          setModalType(null);
          router.refresh();
        }
      });
    } else if (modalType === "restore") {
      startTransition(async () => {
        const result = await restoreLeadFolder(activeFolder.id);
        if (!result.success) {
          setErrorMessage(result.error ?? "Could not restore folder.");
        } else {
          setModalType(null);
          router.refresh();
        }
      });
    }
  };

  const createFolder = () => {
    setModalType("create");
    setFolderNameInput("");
    setErrorMessage("");
  };

  const renameFolder = (folder: any) => {
    setActiveFolder(folder);
    setModalType("rename");
    setFolderNameInput(folder.name);
    setErrorMessage("");
  };

  const removeFolder = (folder: any) => {
    setActiveFolder(folder);
    setModalType("delete");
    setErrorMessage("");
  };

  const archiveFolderFunc = (folder: any) => {
    setActiveFolder(folder);
    setModalType("archive");
    setErrorMessage("");
  };

  const restoreFolderFunc = (folder: any) => {
    setActiveFolder(folder);
    setModalType("restore");
    setErrorMessage("");
  };
  
  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
      {/* Sidebar Header */}
      <div className="border-b border-slate-200 p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <LeadHubMark className="h-9 w-9" />
          <div>
            <p className="text-lg font-bold text-slate-900">LeadHub</p>
            <p className="text-xs font-medium text-slate-500">CRM workspace</p>
          </div>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isImport = item.label === "Import data";
          const isActive = isImport 
            ? isImportOpen 
            : item.label === "Overview" 
              ? pathname === "/dashboard" 
              : pathname === item.href;
          
          if (isImport) {
            return (
              <button
                key={item.label}
                onClick={() => setIsImportOpen(true)}
                className={`
                  w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left
                  ${isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
                `}
              >
                <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${isActive 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
              `}
            >
              <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
        
        {/* Campaigns Section */}
        <div>
          <div className="flex items-center">
            <Link
              href="/dashboard/campaigns"
              className={`
                flex-1 flex items-center gap-3 rounded-l-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${pathname.startsWith("/dashboard/campaigns")
                  ? "bg-blue-50 text-blue-700" 
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
              `}
            >
              <Mail className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              Campaigns
            </Link>
            <button
              onClick={() => setAreCampaignsExpanded(!areCampaignsExpanded)}
              className="h-11 w-11 flex items-center justify-center rounded-r-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              aria-expanded={areCampaignsExpanded}
              aria-label={areCampaignsExpanded ? "Collapse campaigns" : "Expand campaigns"}
            >
              {areCampaignsExpanded ? (
                <ChevronDown className="h-4 w-4" strokeWidth={2} />
              ) : (
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          </div>
          
          {areCampaignsExpanded && (
            <div className="mt-1 space-y-1 pl-3">
              <Link
                href="/dashboard/campaigns"
                className={`
                  flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${pathname === "/dashboard/campaigns"
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
                `}
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                <span>All campaigns</span>
              </Link>
              
              <Link
                href="/dashboard/campaigns/templates"
                className={`
                  flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${pathname === "/dashboard/campaigns/templates"
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
                `}
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                <span>Email templates</span>
              </Link>
              
              <Link
                href="/dashboard/campaigns/media"
                className={`
                  flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${pathname === "/dashboard/campaigns/media"
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
                `}
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
                <span>Media library</span>
              </Link>
            </div>
          )}
        </div>

        {/* Leads Section */}
        <div>
          {/* Leads Nav Item */}
          <div className="flex items-center">
            <Link
              href="/dashboard/leads"
              className={`
                flex-1 flex items-center gap-3 rounded-l-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${pathname === "/dashboard/leads" && searchParams.get("import") !== "true"
                  ? "bg-blue-50 text-blue-700" 
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
              `}
            >
              <Users className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              Leads
            </Link>
            <button
              onClick={() => setAreFoldersExpanded(!areFoldersExpanded)}
              className="h-11 w-11 flex items-center justify-center rounded-r-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              aria-expanded={areFoldersExpanded}
              aria-label={areFoldersExpanded ? "Collapse folders" : "Expand folders"}
            >
              {areFoldersExpanded ? (
                <ChevronDown className="h-4 w-4" strokeWidth={2} />
              ) : (
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          </div>
          
          {/* Nested Folders */}
          {areFoldersExpanded && (
            <div className="mt-1 space-y-1 pl-3">
              {/* All Leads */}
              <Link
                href={{ pathname: "/dashboard/leads", query: Object.fromEntries(new URLSearchParams(searchParams).entries()) }}
                onClick={(e) => {
                  // Remove folder param
                  const params = new URLSearchParams(searchParams);
                  params.delete("folder");
                  e.preventDefault();
                  window.location.href = `/dashboard/leads?${params.toString()}`;
                }}
                className={`
                  flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${!folderId
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
                `}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>All leads</span>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {/* TODO: Calculate total leads count */}
                </span>
              </Link>
              
              {/* Unfiled */}
              <Link
                href={{ pathname: "/dashboard/leads", query: { ...Object.fromEntries(new URLSearchParams(searchParams).entries()), folder: "unfiled" } }}
                className={`
                  flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${folderId === "unfiled"
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
                `}
              >
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>Unfiled</span>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {/* TODO: Calculate unfiled count */}
                </span>
              </Link>
              
              {/* Custom Folders */}
              {folders.map((folder) => {
                const isActive = folderId === folder.id;
                const isArchived = !!folder.archived_at;
                return (
                  <div 
                    key={folder.id} 
                    className={`
                      group relative flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${isActive 
                        ? "bg-blue-50 text-blue-700" 
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"}
                      ${isArchived ? "opacity-60" : ""}
                    `}
                  >
                    <Link
                      href={{ pathname: "/dashboard/leads", query: { ...Object.fromEntries(new URLSearchParams(searchParams).entries()), folder: folder.id } }}
                      className="flex-1 flex items-center gap-2 min-w-0"
                    >
                      <Folder className={`h-4 w-4 shrink-0 ${isArchived ? "text-slate-400" : "text-amber-500"}`} strokeWidth={1.75} />
                      <span className="truncate">{folder.name}</span>
                      {isArchived && (
                        <span className="shrink-0 text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">Archived</span>
                      )}
                    </Link>
                    
                    {/* Hover actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Rename folder"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          renameFolder(folder);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                        disabled={pending}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                      {isArchived ? (
                        <button
                          title="Restore folder"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            restoreFolderFunc(folder);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-green-600 hover:bg-slate-100 transition-colors"
                          disabled={pending}
                        >
                          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      ) : (
                        <button
                          title="Archive folder"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            archiveFolderFunc(folder);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                          disabled={pending}
                        >
                          <Archive className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      )}
                      <button
                        title="Delete folder"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFolder(folder);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                        disabled={pending}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>

                    <span className="text-xs font-medium text-slate-500 tabular-nums group-hover:hidden">
                      {folder.lead_count}
                    </span>
                  </div>
                );
              })}
              
              {/* New Folder Button */}
              <button
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={createFolder}
                disabled={pending}
              >
                <Plus className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                New folder
              </button>
            </div>
          )}
        </div>
      </nav>
      
      {/* Sidebar Footer */}
      <div className="border-t border-slate-200 p-4">
        {/* Trial info */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600">
              Trial · {trialDaysRemaining} days remaining
            </p>
            <ArrowUpRight className="h-4 w-4 text-slate-400" />
          </div>
          <Button 
            size="sm" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
            disabled={isTrialExpired}
          >
            Upgrade plan
          </Button>
        </div>
        
        {/* User info & account dropdown */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
            {agent.business_name?.charAt(0) || agent.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {agent.business_name || agent.name}
            </p>
          </div>
          <div className="relative" ref={profileDropdownRef}>
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="text-slate-500 hover:text-slate-700"
              aria-expanded={isProfileDropdownOpen}
              aria-haspopup="true"
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {isProfileDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                <div className="py-1">
                  <Link 
                    href="/dashboard/profile" 
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserRound className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link 
                    href="/dashboard/profile" 
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <div className="border-t border-slate-100 my-1"></div>
                  <form action={logout} className="w-full">
                    <PendingButton 
                      pendingText="Logging out..."
                      className="w-full justify-start bg-transparent hover:bg-slate-50 text-slate-700 border-0 p-2 h-auto shadow-none"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </PendingButton>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Folder Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900">
              {modalType === "create" && "Create New Folder"}
              {modalType === "rename" && `Rename Folder`}
              {modalType === "delete" && `Delete Folder`}
              {modalType === "archive" && `Archive Folder`}
              {modalType === "restore" && `Restore Folder`}
            </h3>
            
            <p className="text-sm text-slate-500 mt-1.5">
              {modalType === "create" && "Enter a name for the new folder:"}
              {modalType === "rename" && `Enter the new name for "${activeFolder?.name}":`}
              {modalType === "delete" && `Are you sure you want to delete "${activeFolder?.name}"? Leads and subfolders will be moved to the top level.`}
              {modalType === "archive" && `Are you sure you want to archive "${activeFolder?.name}"? All leads in this folder will be archived.`}
              {modalType === "restore" && `Are you sure you want to restore "${activeFolder?.name}"? All leads in this folder will be restored from archive.`}
            </p>

            {(modalType === "create" || modalType === "rename") && (
              <input
                type="text"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="Folder name"
                className="mt-4 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            )}

            {errorMessage && (
              <p className="mt-2 text-xs text-red-600 font-medium">{errorMessage}</p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setModalType(null);
                  setActiveFolder(null);
                  setFolderNameInput("");
                  setErrorMessage("");
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                variant={modalType === "delete" ? "destructive" : "default"}
                size="sm"
                className={modalType === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700 text-white"}
                onClick={handleModalConfirm}
                disabled={pending || ((modalType === "create" || modalType === "rename") && !folderNameInput.trim())}
              >
                {pending ? (
                  <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</span>
                ) : (
                  <>
                    {modalType === "create" && "Create"}
                    {modalType === "rename" && "Rename"}
                    {modalType === "delete" && "Delete"}
                    {modalType === "archive" && "Archive"}
                    {modalType === "restore" && "Restore"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <AddLeadsMenu
        disabled={isTrialExpired}
        openModal={isImportOpen ? "import" : null}
        onModalChange={(m) => setIsImportOpen(m === "import")}
        hideTrigger={true}
      />
    </aside>
  );
}
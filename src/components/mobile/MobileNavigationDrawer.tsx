"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Home,
  Users,
  CalendarCheck,
  UploadCloud,
  UserRoundCog,
  LogOut,
  Mail,
  ChevronRight,
  ChevronDown,
  Folder,
  Plus,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Loader2
} from "lucide-react";
import { LeadHubMark } from "@/components/brand/lead-hub-mark";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/auth/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { 
  getLeadFolders,
  createLeadFolder, 
  deleteLeadFolder, 
  renameLeadFolder, 
  archiveLeadFolder, 
  restoreLeadFolder 
} from "@/app/dashboard/actions";
import { AddLeadsMenu } from "@/components/dashboard/add-leads-menu";

type MobileNavigationDrawerProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  menuButtonRef: React.RefObject<HTMLButtonElement>;
};

export function MobileNavigationDrawer({ isOpen = false, setIsOpen = () => {}, menuButtonRef }: MobileNavigationDrawerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLAnchorElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  const [pending, startTransition] = useTransition();
  const [folders, setFolders] = useState<any[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const folderId = searchParams.get("folder") || undefined;

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

  const fetchFolders = () => {
    getLeadFolders()
      .then((data) => setFolders(data || []))
      .catch((err) => console.error("Error fetching folders in mobile view:", err));
  };

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (e.key === "Tab") {
        const focusableElements = drawerRef.current?.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      firstFocusableRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      menuButtonRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, menuButtonRef]);

  const handleLinkClick = () => setIsOpen(false);

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
          fetchFolders();
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
          fetchFolders();
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
          fetchFolders();
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
          fetchFolders();
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
          fetchFolders();
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

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: Home },
    { href: "/dashboard/follow-ups", label: "Follow-ups", icon: CalendarCheck }
  ];

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        id="mobile-navigation-drawer"
        className={`absolute left-0 top-0 h-full w-[min(84vw,320px)] bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <LeadHubMark className="h-8 w-8" />
              <div>
                <p className="text-base font-bold leading-tight text-slate-900">LeadHub</p>
                <p className="text-xs font-medium text-slate-500">Lead Generation CRM</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  ref={index === 0 ? firstFocusableRef : undefined}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive 
                      ? "bg-blue-50 text-blue-700 font-semibold" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}

            {/* Import data link triggers local modal */}
            <button
              onClick={() => {
                setIsOpen(false);
                setIsImportOpen(true);
              }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors text-left"
            >
              <UploadCloud className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
              Import data
            </button>

            {/* Campaigns Section */}
            <div className="pt-2 border-t border-slate-100 mt-2">
              <div className="flex items-center">
                <Link
                  href="/dashboard/campaigns"
                  onClick={handleLinkClick}
                  className={`flex-1 flex items-center gap-3 rounded-l-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname.startsWith("/dashboard/campaigns")
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Mail className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
                  Campaigns
                </Link>
                <button
                  onClick={() => setAreCampaignsExpanded(!areCampaignsExpanded)}
                  className="h-10 w-10 flex items-center justify-center rounded-r-xl text-slate-500 hover:bg-slate-100 transition-colors"
                  aria-expanded={areCampaignsExpanded}
                  aria-label={areCampaignsExpanded ? "Collapse campaigns" : "Expand campaigns"}
                >
                  {areCampaignsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>

              {areCampaignsExpanded && (
                <div className="pl-3 mt-1 space-y-1">
                  <Link
                    href="/dashboard/campaigns"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      pathname === "/dashboard/campaigns"
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 opacity-50" />
                    <span>All campaigns</span>
                  </Link>

                  <Link
                    href="/dashboard/campaigns/templates"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      pathname === "/dashboard/campaigns/templates"
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 opacity-50" />
                    <span>Email templates</span>
                  </Link>

                  <Link
                    href="/dashboard/campaigns/media"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      pathname === "/dashboard/campaigns/media"
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 opacity-50" />
                    <span>Media library</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Leads Nav section with collapsible folders */}
            <div className="pt-2 border-t border-slate-100 mt-2">
              <div className="flex items-center">
                <Link
                  href="/dashboard/leads"
                  onClick={handleLinkClick}
                  className={`flex-1 flex items-center gap-3 rounded-l-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/dashboard/leads" && !folderId
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Users className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
                  Leads
                </Link>
                <button
                  onClick={() => setAreFoldersExpanded(!areFoldersExpanded)}
                  className="h-10 w-10 flex items-center justify-center rounded-r-xl text-slate-500 hover:bg-slate-100 transition-colors"
                  aria-expanded={areFoldersExpanded}
                  aria-label={areFoldersExpanded ? "Collapse folders" : "Expand folders"}
                >
                  {areFoldersExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>

              {areFoldersExpanded && (
                <div className="pl-3 mt-1 space-y-1">
                  {/* All Leads */}
                  <Link
                    href="/dashboard/leads"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsOpen(false);
                      const params = new URLSearchParams(searchParams);
                      params.delete("folder");
                      router.push(`/dashboard/leads?${params.toString()}`);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      !folderId
                        ? "bg-blue-50 text-blue-700 font-semibold" 
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>All leads</span>
                    </div>
                  </Link>

                  {/* Unfiled */}
                  <Link
                    href="/dashboard/leads?folder=unfiled"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsOpen(false);
                      const params = new URLSearchParams(searchParams);
                      params.set("folder", "unfiled");
                      router.push(`/dashboard/leads?${params.toString()}`);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      folderId === "unfiled"
                        ? "bg-blue-50 text-blue-700 font-semibold" 
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-3.5 w-3.5 text-slate-400" />
                      <span>Unfiled</span>
                    </div>
                  </Link>

                  {/* Custom Folders */}
                  {folders.map((folder) => {
                    const isActive = folderId === folder.id;
                    const isArchived = !!folder.archived_at;
                    return (
                      <div
                        key={folder.id}
                        className={`flex items-center justify-between gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                          isActive 
                            ? "bg-blue-50 text-blue-700 font-semibold" 
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Link
                          href={`/dashboard/leads?folder=${folder.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setIsOpen(false);
                            const params = new URLSearchParams(searchParams);
                            params.set("folder", folder.id);
                            router.push(`/dashboard/leads?${params.toString()}`);
                          }}
                          className="flex-1 min-w-0 flex items-center gap-2"
                        >
                          <Folder className={`h-3.5 w-3.5 shrink-0 ${isArchived ? "text-slate-400" : "text-amber-500"}`} />
                          <span className="truncate">{folder.name}</span>
                          {isArchived && (
                            <span className="shrink-0 text-[9px] bg-slate-200 px-1.5 py-0.2 rounded-full text-slate-600">Archived</span>
                          )}
                        </Link>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            title="Rename folder"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              renameFolder(folder);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                            disabled={pending}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {isArchived ? (
                            <button
                              title="Restore folder"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                restoreFolderFunc(folder);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-green-600 hover:bg-slate-100"
                              disabled={pending}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              title="Archive folder"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                archiveFolderFunc(folder);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100"
                              disabled={pending}
                            >
                              <Archive className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            title="Delete folder"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeFolder(folder);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100"
                            disabled={pending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-[10px] text-slate-400 font-semibold ml-1 shrink-0">
                          {folder.lead_count}
                        </span>
                      </div>
                    );
                  })}

                  {/* New Folder Button */}
                  <button
                    onClick={createFolder}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    disabled={pending}
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                    New folder
                  </button>
                </div>
              )}
            </div>
          </nav>
          {/* Account section */}
          <div className="border-t border-slate-200 px-4 py-4 space-y-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Account</p>
            <Link
              href="/dashboard/profile"
              onClick={handleLinkClick}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <UserRoundCog className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
              Profile
            </Link>
            <form action={logout} className="w-full">
              <PendingButton
                ref={lastFocusableRef}
                variant="ghost"
                className="w-full justify-start gap-3 px-3 h-auto py-2.5 hover:bg-slate-100"
                pendingText="Logging out..."
              >
                <LogOut className="h-5 w-5 text-slate-500" strokeWidth={1.75} />
                Logout
              </PendingButton>
            </form>
          </div>
        </div>
      </div>

      {/* Folder Modals */}
      {modalType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6 text-left">
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
              {modalType === "delete" && `Are you sure you want to delete "${activeFolder?.name}"? Leads will be moved to the top level.`}
              {modalType === "archive" && `Are you sure you want to archive "${activeFolder?.name}"? All leads in this folder will be archived.`}
              {modalType === "restore" && `Are you sure you want to restore "${activeFolder?.name}"? All leads in this folder will be restored from archive.`}
            </p>

            {(modalType === "create" || modalType === "rename") && (
              <input
                type="text"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="Folder name"
                className="mt-4 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
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
        disabled={false}
        openModal={isImportOpen ? "import" : null}
        onModalChange={(m) => setIsImportOpen(m === "import")}
        hideTrigger={true}
      />
    </div>
  );
}

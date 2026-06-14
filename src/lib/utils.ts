import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

// Add getFolderName here
export function getFolderName(folders: any[], folderId?: string | null): string | null {
  if (folderId === "unfiled") return "Unfiled";
  if (!folderId) return null;
  const folder = folders.find((f) => f.id === folderId);
  return folder?.name || null;
}

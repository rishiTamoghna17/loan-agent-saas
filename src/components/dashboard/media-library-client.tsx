"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  Upload, 
  Trash2, 
  Eye, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  FileDown, 
  Loader2, 
  Plus,
  Paperclip,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteAgentMediaFile } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";

type MediaFile = {
  name: string;
  id: string;
  created_at: string;
  size: number;
  mimeType: string;
  url: string;
};

type MediaLibraryClientProps = {
  agent: any;
  initialFiles: MediaFile[];
  isTrialExpired: boolean;
};

export function MediaLibraryClient({
  agent,
  initialFiles,
  isTrialExpired
}: MediaLibraryClientProps) {
  const router = useRouter();
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadStatus({
        success: false,
        message: "Unsupported file format. Please upload PDF, Word, Excel, CSV, text, or images."
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({
        success: false,
        message: "File is too large. Max size allowed is 10MB."
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus(null);
      
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        body: data
      });
      
      const result = await res.json();

      if (res.ok && result.url) {
        setUploadStatus({
          success: true,
          message: "File uploaded successfully!"
        });
        
        // Add to local state
        const newFile: MediaFile = {
          name: result.url.split('/').pop() || file.name,
          id: String(Date.now()),
          created_at: new Date().toISOString(),
          size: file.size,
          mimeType: file.type,
          url: result.url
        };
        
        setFiles(prev => [newFile, ...prev]);
        router.refresh();
      } else {
        setUploadStatus({
          success: false,
          message: result.error || "Failed to upload file."
        });
      }
    } catch (err: any) {
      console.error(err);
      setUploadStatus({
        success: false,
        message: err.message || "Failed to upload file."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = (fileName: string) => {
    if (!confirm("Are you sure you want to delete this file? Any templates referencing it will have broken attachments.")) return;
    
    startTransition(async () => {
      const res = await deleteAgentMediaFile(fileName);
      if (res.success) {
        setFiles(prev => prev.filter(f => f.name !== fileName));
        setUploadStatus({
          success: true,
          message: "File deleted successfully!"
        });
        router.refresh();
      } else {
        setUploadStatus({
          success: false,
          message: res.error || "Failed to delete file."
        });
      }
    });
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    return files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-10 w-10 text-blue-500" />;
    }
    if (mimeType.includes("pdf")) {
      return <FileText className="h-10 w-10 text-red-500" />;
    }
    return <FileText className="h-10 w-10 text-slate-500" />;
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Media Library</h1>
          <p className="text-sm text-slate-500 mt-1">Upload and manage PDFs, images, and documents for campaigns.</p>
        </div>
        
        <label className={`inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 px-5 rounded-xl shadow-sm hover:shadow-blue-100 cursor-pointer gap-2 transition-all self-start ${isTrialExpired || isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span>{isUploading ? "Uploading..." : "Upload File"}</span>
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png,.webp"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading || isTrialExpired}
          />
        </label>
      </div>

      {/* Notifications */}
      {uploadStatus && (
        <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm max-w-md ${
          uploadStatus.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {uploadStatus.success ? (
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{uploadStatus.message}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by file name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10.5 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredFiles.map(file => (
          <Card key={file.id} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:border-slate-300 transition-all flex flex-col justify-between group">
            <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group-hover:scale-105 transition-transform duration-200">
                {getFileIcon(file.mimeType)}
              </div>
              <div className="space-y-1 w-full">
                <p className="text-sm font-bold text-slate-900 truncate px-2" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[11px] text-slate-500 font-semibold">{formatBytes(file.size)}</p>
                <p className="text-[10px] text-slate-400 font-medium">Uploaded: {new Date(file.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>

            <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 flex items-center justify-between">
              <a 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
              >
                <Eye className="h-3.5 w-3.5" />
                View File
              </a>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteFile(file.name)}
                disabled={isTrialExpired || pending}
                className="text-red-500 hover:text-red-600 hover:bg-red-50/50 p-2 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}

        {filteredFiles.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              <Paperclip className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">No media files found</p>
              <p className="text-xs text-slate-500 mt-0.5">Upload document attachments or campaign banners to get started.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

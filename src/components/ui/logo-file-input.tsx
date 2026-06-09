"use client";

import { useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { compressLogoImage } from "@/lib/image-compression";

export function LogoFileInput({
  name,
  onFileChange
}: {
  name?: string;
  onFileChange?: (file: File | null) => void;
}) {
  const [message, setMessage] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);

  return (
    <label>
      <span className="label">{name ? "Upload new logo image" : "Upload logo image"}</span>
      <div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
        {isCompressing ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-blue" /> : <ImageUp className="h-5 w-5 shrink-0 text-brand-blue" />}
        <input
          type="file"
          name={name}
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={isCompressing}
          className="w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
          onChange={async (event) => {
            const input = event.currentTarget;
            const selectedFile = input.files?.[0] ?? null;
            setMessage("");

            if (!selectedFile) {
              onFileChange?.(null);
              return;
            }

            setIsCompressing(true);

            try {
              const compressedFile = await compressLogoImage(selectedFile);
              const transfer = new DataTransfer();
              transfer.items.add(compressedFile);
              input.files = transfer.files;
              onFileChange?.(compressedFile);

              if (compressedFile.size < selectedFile.size) {
                setMessage(`Compressed from ${formatBytes(selectedFile.size)} to ${formatBytes(compressedFile.size)}.`);
              } else {
                setMessage(`Ready to upload (${formatBytes(compressedFile.size)}).`);
              }
            } catch (error) {
              input.value = "";
              onFileChange?.(null);
              setMessage(error instanceof Error ? error.message : "Could not compress the logo image.");
            } finally {
              setIsCompressing(false);
            }
          }}
        />
      </div>
      <span className={`mt-1 block text-xs ${message.toLowerCase().includes("could not") || message.toLowerCase().includes("too large") ? "text-red-600" : "text-slate-500"}`}>
        {message || "Large images are automatically compressed below 2 MB before upload."}
      </span>
    </label>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

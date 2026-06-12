"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { importLeadsWithFolder } from "@/app/dashboard/actions";

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function LeadImport({ folderId }: { folderId?: string }) {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    count?: number;
    error?: string;
    folderId?: string;
    folderName?: string;
  } | null>(null);

  const extractFolderName = (filename: string): string => {
    // Remove extension
    const name = filename.replace(/\.(csv|csv.gz|CSV|CSV.GZ)$/i, "").trim();
    // Replace underscores and hyphens with spaces
    const formatted = name.replace(/[_-]/g, " ");
    // Capitalize each word
    const capitalized = formatted.replace(/\b\w/g, l => l.toUpperCase());
    // Trim and limit length
    return capitalized.trim().slice(0, 100);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const folderName = extractFolderName(file.name);
          let targetFolderId: string | undefined = folderId;

          // If a folder was specified in the URL, use it
          if (folderId && uuidRegex.test(folderId)) {
            targetFolderId = folderId;
          }

          // Import leads - adapt to leads schema
          const leads = results.data.map((row: any) => ({
            name: row.name || row["Candidate Name"] || "",
            email: (row.email || row["Candidate Email"] || "").trim().toLowerCase(),
            phone: row.phone || row["Candidate Phone"] || "",
            loan_type: row.loan_type || row["Loan Type"] || "",
            required_amount: row.required_amount || row["Loan Amount"] || "0",
            city: row.city || row["City"] || "",
            district: row.district || row["District"] || "",
            state: row.state || row["State"] || "",
            pincode: row.pincode || row["Pincode"] || "",
            source: "Manual",
            status: "new"
          }));

          const validLeads = leads.filter(l => l.name && (l.email && l.email.includes("@") || l.phone));

          if (validLeads.length === 0) {
            setResult({
              success: false,
              error: "No valid leads found in CSV (name is required, and either email or phone)"
            });
            setIsImporting(false);
            e.target.value = "";
            return;
          }

          // Import with folder name for auto-folder creation
          const response = await importLeadsWithFolder(validLeads, targetFolderId, folderName);

          if (response.success) {
            setResult({
              success: true,
              count: response.count,
              folderId: targetFolderId,
              folderName: response.folderName || folderName
            });
          } else {
            setResult({
              success: false,
              error: response.error || "Failed to import leads"
            });
          }
        } catch (error) {
          setResult({ success: false, error: "Failed to process CSV data" });
        } finally {
          setIsImporting(false);
          // Clear input
          e.target.value = "";
        }
      },
      error: (error) => {
        setResult({ success: false, error: `CSV Parse Error: ${error.message}` });
        setIsImporting(false);
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Import Leads</h2>
      <p className="mb-4 text-sm text-slate-500">Upload your leads CSV file with standard columns (name, email/phone, loan_type).</p>

      <div className="mb-4">
        <a
          href="/sample-leads-import-template.csv"
          download
          className="text-sm font-semibold text-brand-blue hover:underline"
        >
          Download Sample Template &rarr;
        </a>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-slate-200 p-8">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isImporting}
          className="hidden"
          id="csv-upload"
        />
        <label
          htmlFor="csv-upload"
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg bg-slate-50 px-6 py-4 transition-colors hover:bg-slate-100 ${isImporting ? "pointer-events-none opacity-50" : ""}`}
        >
          {isImporting ? (
            <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          ) : (
            <Upload className="h-8 w-8 text-slate-400" />
          )}
          <span className="font-medium text-slate-600">
            {isImporting ? "Importing..." : "Click to upload CSV"}
          </span>
        </label>

        {result && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.success ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {result.folderId ? (
                  <span>
                    Successfully imported {result.count} leads into folder: <span className="font-semibold">{result.folderName || "Current folder"}</span>!
                  </span>
                ) : (
                  <span>Successfully imported {result.count} leads!</span>
                )}
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                {result.error}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

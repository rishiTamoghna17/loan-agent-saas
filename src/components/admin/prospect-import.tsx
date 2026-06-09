"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { importProspects } from "@/app/admin/actions";

export function ProspectImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

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
          const prospects = results.data.map((row: any) => ({
            // Support both generic format and LeadHub specific CSV format
            company_name: row.company_name || row["Business Name"] || "",
            name: row.name || row["Contact Person"] || row["Business Name"] || "",
            email: (row.email || row["Public Email"] || "").trim().toLowerCase(),
            phone: row.phone || row["Public Phone"] || "",
            city: row.city || row["City"] || "",
            loan_category: row.loan_category || row["Loan Categories"] || "",
            status: "new",
            lead_score: 0
          }));

          const response = await importProspects(prospects);
          setResult(response);
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
      <h2 className="text-lg font-semibold text-ink">Import Prospects</h2>
      <p className="mb-4 text-sm text-slate-500">Upload your LeadHub prospects CSV or a file with standard columns (name, email, city).</p>
      
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                Successfully imported {result.count} prospects!
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

"use client";

import { useState } from "react";
import Papa from "papaparse";
import { FileSpreadsheet, Upload } from "lucide-react";
import { importLeadsWithFolder } from "@/app/dashboard/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LeadImport({ folderId }: { folderId?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPending(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      async complete(results) {
        const result = await importLeadsWithFolder(results.data, folderId);
        setMessage(result.success ? `Imported ${result.count} leads.` : result.error ?? "Import failed.");
        setPending(false);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <FileSpreadsheet className="h-[18px] w-[18px] shrink-0 mt-0.5 text-slate-500" strokeWidth={1.75} />
          <div>
            <CardTitle className="leading-[24px]">Import leads</CardTitle>
            <CardDescription className="leading-[20px]">Upload CSV</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleChange}
            className="hidden"
            id="lead-upload"
            disabled={pending}
          />
          <label
            htmlFor="lead-upload"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600 hover:border-blue-500 hover:text-blue-600"
          >
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            {pending ? "Processing..." : "Upload CSV"}
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">{message || "Columns: name, phone, email, company, city, notes, loan_type, required_amount."}</p>
      </CardContent>
    </Card>
  );
}

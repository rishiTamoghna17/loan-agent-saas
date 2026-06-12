"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { createManualLead, importLeads } from "@/app/dashboard/actions";
import { LEAD_SOURCES, LOAN_PRODUCTS } from "@/lib/constants";

const fields = ["name", "phone", "email", "loan_type", "required_amount", "monthly_income", "city", "district", "state", "pincode", "landmark", "source", "message"] as const;
type LeadDraft = Record<(typeof fields)[number], string>;
const requiredFields: Array<keyof LeadDraft> = ["name", "phone", "required_amount", "city", "district", "state", "pincode"];
const emptyLead: LeadDraft = { name: "", phone: "", email: "", loan_type: "Personal Loan", required_amount: "", monthly_income: "", city: "", district: "", state: "", pincode: "", landmark: "", source: "Manual", message: "" };

function normalizeRow(row: Record<string, unknown>): LeadDraft {
  const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replaceAll(" ", "_"), value]));
  return Object.fromEntries(fields.map((field) => [field, String(values[field] ?? (field === "source" ? "Manual" : "")).trim()])) as LeadDraft;
}

export function AddLeadsMenu({ disabled }: { disabled: boolean }) {
  const [modal, setModal] = useState<"manual" | "import" | null>(null);
  const [lead, setLead] = useState(emptyLead);
  const [rows, setRows] = useState<LeadDraft[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveLead(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await createManualLead(lead);
    setBusy(false);
    if (!result.ok) return toast.error(result.message);
    toast.success(result.message);
    setLead(emptyLead);
    setModal(null);
  }

  async function readFile(file: File) {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" }).map(normalizeRow);
      setRows(parsed);
      setFileName(file.name);
      parsed.length ? toast.info(`${parsed.length} rows ready to import.`) : toast.error("The selected file has no lead rows.");
    } catch {
      toast.error("Could not read this file. Use CSV, XLS, or XLSX.");
    }
  }

  async function runImport() {
    setBusy(true);
    const result = await importLeads(rows);
    setBusy(false);
    if (!result.ok) return toast.error(result.message);
    toast.success(result.message);
    if (result.rejected?.length) toast.warning(`${result.rejected.length} invalid row${result.rejected.length === 1 ? " was" : "s were"} skipped.`);
    setRows([]);
    setFileName("");
    setModal(null);
  }

  function downloadSample() {
    const sample = [{ ...emptyLead, name: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com", loan_type: "Home Loan", required_amount: "2500000", monthly_income: "75000", city: "Mumbai", district: "Mumbai", state: "Maharashtra", pincode: "400001", source: "Referral" }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sample, { header: [...fields] }), "Leads");
    XLSX.writeFile(workbook, "LeadHub-lead-import-sample.xlsx");
  }

  return <>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn-primary" disabled={disabled} onClick={() => setModal("manual")}><Plus className="h-4 w-4" /> Add lead</button>
      <button type="button" className="btn-secondary" disabled={disabled} onClick={() => setModal("import")}><Upload className="h-4 w-4" /> Bulk import</button>
    </div>
    {modal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && !busy && setModal(null)}>
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
          <div><p className="text-xs font-bold uppercase text-brand-blue">{modal === "manual" ? "Manual entry" : "Spreadsheet import"}</p><h2 className="mt-1 text-xl font-bold text-ink">{modal === "manual" ? "Add a lead" : "Import leads"}</h2></div>
          <button type="button" className="btn-secondary h-9 w-9 p-0" disabled={busy} onClick={() => setModal(null)} aria-label="Close"><X className="h-4 w-4" /></button>
        </header>
        {modal === "manual" ? <form onSubmit={saveLead} className="p-5"><LeadFields value={lead} onChange={setLead} /><button className="btn-primary mt-5 w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{busy ? "Adding lead..." : "Add lead"}</button></form> :
          <div className="space-y-5 p-5">
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-ink">Upload CSV, XLS, or XLSX</p><p className="mt-1 text-sm text-slate-600">Maximum 1,000 rows. Invalid rows are skipped.</p></div><button type="button" className="btn-secondary shrink-0" onClick={() => fileRef.current?.click()}><FileSpreadsheet className="h-4 w-4" /> Choose file</button><input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])} /></div>
            <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue" onClick={downloadSample}><Download className="h-4 w-4" /> Download sample Excel file</button>
            {fileName ? <p className="rounded-md bg-slate-50 p-3 text-sm"><strong>{fileName}</strong> · {rows.length} rows ready</p> : null}
            {rows.length ? <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Loan</th><th className="p-3">City</th><th className="p-3">Amount</th></tr></thead><tbody>{rows.slice(0, 5).map((row, index) => <tr key={index} className="border-t border-slate-100"><td className="p-3">{row.name}</td><td className="p-3">{row.phone}</td><td className="p-3">{row.loan_type}</td><td className="p-3">{row.city}</td><td className="p-3">{row.required_amount}</td></tr>)}</tbody></table></div> : null}
            <button type="button" className="btn-primary w-full" disabled={busy || !rows.length} onClick={runImport}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? "Importing..." : `Import ${rows.length || ""} leads`}</button>
          </div>}
      </section>
    </div> : null}
  </>;
}

function LeadFields({ value, onChange }: { value: LeadDraft; onChange: (value: LeadDraft) => void }) {
  const update = (field: keyof LeadDraft, next: string) => onChange({ ...value, [field]: next });
  return <div className="grid gap-4 sm:grid-cols-2">
    {(["name", "phone", "email", "required_amount", "monthly_income", "city", "district", "state", "pincode", "landmark"] as const).map((field) => <label key={field}><span className="label capitalize">{field.replaceAll("_", " ")}{requiredFields.includes(field) ? " *" : ""}</span><input className="field" required={requiredFields.includes(field)} type={field.includes("amount") || field === "monthly_income" ? "number" : "text"} value={value[field]} onChange={(event) => update(field, event.target.value)} /></label>)}
    <label><span className="label">Loan type *</span><select className="field" value={value.loan_type} onChange={(event) => update("loan_type", event.target.value)}>{LOAN_PRODUCTS.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label><span className="label">Source *</span><select className="field" value={value.source} onChange={(event) => update("source", event.target.value)}>{LEAD_SOURCES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="sm:col-span-2"><span className="label">Message</span><textarea className="field min-h-24" value={value.message} onChange={(event) => update("message", event.target.value)} /></label>
  </div>;
}

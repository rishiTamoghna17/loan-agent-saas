"use client";

import { useRef, useState, useCallback } from "react";
import { Download, FileSpreadsheet, Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { createManualLead, importLeads } from "@/app/dashboard/actions";
import { LEAD_SOURCES, LOAN_PRODUCTS } from "@/lib/constants";
import { PincodeAddressFields } from "@/components/address/pincode-address-fields";
import { Button } from "@/components/ui/button";

const fields = ["name", "phone", "email", "loan_type", "required_amount", "monthly_income", "city", "district", "state", "pincode", "landmark", "source", "message"] as const;
type LeadDraft = Record<(typeof fields)[number], string>;
const requiredFields: Array<keyof LeadDraft> = ["name", "phone", "required_amount", "city", "district", "state", "pincode"];
const emptyLead: LeadDraft = { name: "", phone: "", email: "", loan_type: "Personal Loan", required_amount: "", monthly_income: "", city: "", district: "", state: "", pincode: "", landmark: "", source: "Manual", message: "" };

function normalizeRow(row: Record<string, unknown>): LeadDraft {
  const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replaceAll(" ", "_"), value]));
  const normalized = Object.fromEntries(fields.map((field) => [field, String(values[field] ?? (field === "source" ? "Manual" : "")).trim()])) as LeadDraft;
  normalized.source = LEAD_SOURCES.includes(normalized.source as (typeof LEAD_SOURCES)[number]) ? normalized.source : "Manual";
  return normalized;
}

function folderNameFromFile(fileName: string) {
  return fileName
    .replace(/\.(csv|xls|xlsx)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
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
    const result = await importLeads(rows, folderNameFromFile(fileName));
    setBusy(false);
    if (!result.ok) {
      const firstReason = result.rejected?.[0]?.reason;
      return toast.error(firstReason ? `${result.message} First issue: ${firstReason}` : result.message);
    }
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
      <Button disabled={disabled} onClick={() => setModal("manual")} className="flex items-center gap-1.5">
        <Plus className="h-4 w-4" /> Add lead
      </Button>
      <Button variant="outline" disabled={disabled} onClick={() => setModal("import")} className="flex items-center gap-1.5">
        <Upload className="h-4 w-4" /> Bulk import
      </Button>
    </div>
    {modal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && !busy && setModal(null)}>
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
          <div><p className="text-xs font-bold uppercase text-blue-600">{modal === "manual" ? "Lead entry" : "Spreadsheet import"}</p><h2 className="mt-1 text-xl font-bold text-slate-900">{modal === "manual" ? "Add a lead" : "Import leads"}</h2></div>
          <Button variant="outline" size="icon" disabled={busy} onClick={() => setModal(null)} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </header>
        {modal === "manual" ? <form onSubmit={saveLead} className="p-5"><LeadFields value={lead} onChange={setLead} /><Button className="mt-5 w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{busy ? " Adding lead..." : " Add lead"}</Button></form> :
          <div className="space-y-5 p-5">
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">Upload CSV, XLS, or XLSX</p><p className="mt-1 text-sm text-slate-600">Maximum 1,000 rows. Invalid rows are skipped.</p></div><Button variant="outline" className="shrink-0" onClick={() => fileRef.current?.click()}><FileSpreadsheet className="h-4 w-4" /> Choose file</Button><input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])} /></div>
            <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600" onClick={downloadSample}><Download className="h-4 w-4" /> Download sample Excel file</button>
            {fileName ? <p className="rounded-md bg-slate-50 p-3 text-sm"><strong>{fileName}</strong> · {rows.length} rows ready</p> : null}
            {rows.length ? <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Loan</th><th className="p-3">City</th><th className="p-3">Amount</th></tr></thead><tbody>{rows.slice(0, 5).map((row, index) => <tr key={index} className="border-t border-slate-100"><td className="p-3">{row.name}</td><td className="p-3">{row.phone}</td><td className="p-3">{row.loan_type}</td><td className="p-3">{row.city}</td><td className="p-3">{row.required_amount}</td></tr>)}</tbody></table></div> : null}
            <Button className="w-full" disabled={busy || !rows.length} onClick={runImport}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? " Importing..." : ` Import ${rows.length || ""} leads`}</Button>
          </div>}
      </section>
    </div> : null}
  </>;
}

function LeadFields({ value, onChange }: { value: LeadDraft; onChange: React.Dispatch<React.SetStateAction<LeadDraft>> }) {
  // Use functional updates to avoid depending on `value` in callbacks
  const update = useCallback((field: keyof LeadDraft, next: string) => {
    onChange(prevValue => ({ ...prevValue, [field]: next }));
  }, [onChange]);
  
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only digits
    let phone = e.target.value.replace(/\D/g, '');
    // Restrict to 10 digits
    phone = phone.slice(0, 10);
    update('phone', phone);
  }, [update]);

  const handleAddressChange = useCallback((address: { city: string; district: string; state: string; pincode: string }) => {
    onChange(prevValue => ({
      ...prevValue,
      city: address.city,
      district: address.district,
      state: address.state,
      pincode: address.pincode
    }));
  }, [onChange]);

  return <div className="grid gap-4 sm:grid-cols-2">
    <label>
      <span className="label">Name *</span>
      <input 
        className="field" 
        required 
        type="text" 
        value={value.name} 
        onChange={(event) => update("name", event.target.value)} 
      />
    </label>
    
    {/* Phone field with 10-digit restriction */}
    <label>
      <span className="label">Phone *</span>
      <input 
        className="field" 
        required 
        type="tel" 
        maxLength={10}
        inputMode="numeric"
        value={value.phone} 
        onChange={handlePhoneChange} 
      />
    </label>
    
    <label>
      <span className="label">Email</span>
      <input 
        className="field" 
        type="email" 
        value={value.email} 
        onChange={(event) => update("email", event.target.value)} 
      />
    </label>
    
    <label>
      <span className="label">Required amount *</span>
      <input 
        className="field" 
        required 
        type="number" 
        value={value.required_amount} 
        onChange={(event) => update("required_amount", event.target.value)} 
      />
    </label>
    
    <label>
      <span className="label">Monthly income</span>
      <input 
        className="field" 
        type="number" 
        value={value.monthly_income} 
        onChange={(event) => update("monthly_income", event.target.value)} 
      />
    </label>
    
    <label>
      <span className="label">Landmark</span>
      <input 
        className="field" 
        type="text" 
        value={value.landmark} 
        onChange={(event) => update("landmark", event.target.value)} 
      />
    </label>
    
    <PincodeAddressFields
      initialCity={value.city}
      initialDistrict={value.district}
      initialState={value.state}
      initialPincode={value.pincode}
      required={true}
      onAddressChange={handleAddressChange}
    />
    
    <label><span className="label">Loan type *</span><select className="field" value={value.loan_type} onChange={(event) => update("loan_type", event.target.value)}>{LOAN_PRODUCTS.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label><span className="label">Source *</span><select className="field" value={value.source} onChange={(event) => update("source", event.target.value)}>{LEAD_SOURCES.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="sm:col-span-2"><span className="label">Message</span><textarea className="field min-h-24" value={value.message} onChange={(event) => update("message", event.target.value)} /></label>
  </div>;
}

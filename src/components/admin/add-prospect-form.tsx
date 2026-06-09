"use client";

import { useState } from "react";
import { Plus, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { addProspect } from "@/app/admin/actions";

export function AddProspectForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      company_name: formData.get("company_name") as string,
      phone: formData.get("phone") as string,
      city: formData.get("city") as string,
      loan_category: formData.get("loan_category") as string,
    };

    try {
      const response = await addProspect(data);
      setResult(response);
      if (response.success) {
        // Reset form or close after delay
        setTimeout(() => {
          setIsOpen(false);
          setResult(null);
        }, 2000);
      }
    } catch (error) {
      setResult({ success: false, error: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary"
      >
        <Plus className="h-4 w-4" />
        Add Prospect
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">Add New Prospect</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700">Full Name</label>
              <input
                required
                name="name"
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                placeholder="John Doe"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <input
                required
                name="email"
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <input
                name="phone"
                type="tel"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                placeholder="+91..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">City</label>
              <input
                name="city"
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                placeholder="Mumbai"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700">Company Name</label>
              <input
                name="company_name"
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                placeholder="Acme Corp"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700">Loan Category</label>
              <select
                name="loan_category"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              >
                <option value="">Select Category</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="LAP">Loan Against Property</option>
              </select>
            </div>
          </div>

          {result && (
            <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Prospect added successfully!
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  {result.error}
                </>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Prospect"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

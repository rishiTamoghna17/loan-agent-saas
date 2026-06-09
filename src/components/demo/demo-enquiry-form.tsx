"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { LOAN_PRODUCTS } from "@/lib/constants";

export function DemoEnquiryForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <h2 className="text-xl font-bold text-ink">Apply now</h2>
      <p className="mt-1 text-sm text-slate-600">Try the customer enquiry experience.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Name</span>
          <input className="field" placeholder="Your name" required />
        </label>
        <label>
          <span className="label">Phone</span>
          <input className="field" placeholder="10-digit mobile number" required />
        </label>
        <label>
          <span className="label">Loan type</span>
          <select className="field">
            {LOAN_PRODUCTS.map((product) => (
              <option key={product}>{product}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Required amount</span>
          <input className="field" type="number" defaultValue={500000} required />
        </label>
      </div>

      {submitted ? (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Demo enquiry captured. Real agent pages save this directly to the CRM.
        </p>
      ) : null}

      <button type="submit" className="btn-primary mt-5 w-full">
        <Send className="h-4 w-4" />
        Submit demo enquiry
      </button>
    </form>
  );
}

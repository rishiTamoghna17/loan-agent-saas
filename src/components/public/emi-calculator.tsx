"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export function EmiCalculator() {
  const [amount, setAmount] = useState(500000);
  const [rate, setRate] = useState(12);
  const [months, setMonths] = useState(60);

  const emi = useMemo(() => {
    const monthlyRate = rate / 12 / 100;
    if (!monthlyRate) return amount / months;
    return (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  }, [amount, months, rate]);

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-brand-blue" />
        <h2 className="text-xl font-bold text-ink">EMI calculator</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="label">Loan amount</span>
          <input className="field" type="number" value={amount} min={1000} onChange={(event) => setAmount(Number(event.target.value))} />
        </label>
        <label>
          <span className="label">Interest rate %</span>
          <input className="field" type="number" value={rate} min={1} step={0.1} onChange={(event) => setRate(Number(event.target.value))} />
        </label>
        <label>
          <span className="label">Tenure months</span>
          <input className="field" type="number" value={months} min={1} onChange={(event) => setMonths(Number(event.target.value))} />
        </label>
      </div>
      <div className="mt-5 rounded-lg bg-brand-mint p-4">
        <p className="text-sm font-medium text-emerald-800">Estimated EMI</p>
        <p className="mt-1 text-3xl font-bold text-emerald-950">{formatCurrency(Math.round(emi))}</p>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { LOAN_PRODUCTS } from "@/lib/constants";

export function ServicesOfferedFields({ selectedServices }: { selectedServices: string[] }) {
  const [services, setServices] = useState<string[]>(selectedServices);
  const allSelected = useMemo(() => LOAN_PRODUCTS.every((service) => services.includes(service)), [services]);

  function toggleAll(checked: boolean) {
    setServices(checked ? [...LOAN_PRODUCTS] : []);
  }

  function toggleService(service: string, checked: boolean) {
    setServices((current) => {
      if (checked) return Array.from(new Set([...current, service]));
      return current.filter((item) => item !== service);
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <label className="flex items-center gap-2 rounded-md border border-brand-blue bg-blue-50 p-3 text-sm font-semibold text-brand-blue">
        <input type="checkbox" checked={allSelected} onChange={(event) => toggleAll(event.target.checked)} />
        All services
      </label>
      {LOAN_PRODUCTS.map((service) => (
        <label key={service} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
          <input
            type="checkbox"
            name="services_offered"
            value={service}
            checked={services.includes(service)}
            onChange={(event) => toggleService(service, event.target.checked)}
          />
          {service}
        </label>
      ))}
    </div>
  );
}

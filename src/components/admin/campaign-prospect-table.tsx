"use client";

import { useState } from "react";
import { CampaignSender } from "@/components/admin/campaign-sender";
import { Mail, MapPin, Search, Phone } from "lucide-react";

export function CampaignProspectTable({ 
  prospects, 
  customTemplates = [] 
}: { 
  prospects: any[]; 
  customTemplates?: any[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filteredProspects = prospects.filter(p => 
    p.name?.toLowerCase().includes(query.toLowerCase()) || 
    p.email?.toLowerCase().includes(query.toLowerCase()) ||
    p.company_name?.toLowerCase().includes(query.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredProspects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProspects.map(p => p.id));
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search prospects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-brand-blue focus:outline-none"
            />
          </div>
          <div className="text-sm font-medium text-slate-500">
            {selectedIds.length} selected
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase text-slate-500 shadow-sm">
                <tr>
                  <th className="px-6 py-4 bg-slate-50 w-12">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredProspects.length && filteredProspects.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                    />
                  </th>
                  <th className="px-6 py-4 bg-slate-50 w-12 text-center">#</th>
                  <th className="px-6 py-4 bg-slate-50">Prospect</th>
                  <th className="px-6 py-4 bg-slate-50">Status</th>
                  <th className="px-6 py-4 bg-slate-50">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProspects.map((prospect, index) => (
                  <tr 
                    key={prospect.id} 
                    className={`hover:bg-slate-50/50 cursor-pointer ${selectedIds.includes(prospect.id) ? "bg-blue-50/50" : ""}`}
                    onClick={() => toggleSelect(prospect.id)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(prospect.id)}
                        onChange={() => toggleSelect(prospect.id)}
                        className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                      />
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink">{prospect.name}</div>
                      <div className="flex flex-col gap-1 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {prospect.email}
                        </div>
                        {prospect.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {prospect.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize text-slate-500">
                      {prospect.status?.replace("_", " ")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-ink">{prospect.lead_score || 0}</span>
                    </td>
                  </tr>
                ))}
                {filteredProspects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No prospects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <CampaignSender 
          selectedProspects={selectedIds} 
          customTemplates={customTemplates}
        />
      </div>
    </div>
  );
}

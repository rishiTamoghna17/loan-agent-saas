"use client";

import { useState } from "react";
import { CampaignSender } from "@/components/admin/campaign-sender";
import { Mail, MapPin, Search } from "lucide-react";

export function CampaignProspectTable({ prospects }: { prospects: any[] }) {
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
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="text-sm font-medium text-slate-500">
            {selectedIds.length} selected
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredProspects.length && filteredProspects.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-4">Prospect</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProspects.map((prospect) => (
                  <tr 
                    key={prospect.id} 
                    className={`hover:bg-slate-50/50 cursor-pointer ${selectedIds.includes(prospect.id) ? "bg-primary/5" : ""}`}
                    onClick={() => toggleSelect(prospect.id)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(prospect.id)}
                        onChange={() => toggleSelect(prospect.id)}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink">{prospect.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mail className="h-3 w-3" />
                        {prospect.email}
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
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
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
        <CampaignSender selectedProspects={selectedIds} />
      </div>
    </div>
  );
}

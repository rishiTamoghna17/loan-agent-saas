import { getAdminSupabase } from "@/lib/admin-auth";
import { 
  TrendingUp, 
  User, 
  Calendar, 
  ShieldCheck, 
  CreditCard 
} from "lucide-react";

export default async function ConversionsPage() {
  const supabase = await getAdminSupabase();

  const { data: conversions } = await supabase
    .from("conversions")
    .select(`
      *,
      prospects (name, email, company_name),
      agents (business_name, agent_name)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Conversions</h1>
        <p className="text-slate-500">Monitor trial starts and paid customer conversions.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Prospect</th>
                <th className="px-6 py-4">Conversion Type</th>
                <th className="px-6 py-4">Agent Profile</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversions?.map((conv: any) => (
                <tr key={conv.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-ink">{conv.prospects?.name}</div>
                        <div className="text-xs text-slate-500">{conv.prospects?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {conv.conversion_type === "trial_started" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          <ShieldCheck className="h-3 w-3" />
                          Trial Started
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <CreditCard className="h-3 w-3" />
                          Paid Active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600 font-medium">{conv.agents?.business_name || "N/A"}</div>
                    <div className="text-xs text-slate-400">{conv.agents?.agent_name}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(conv.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
              {(!conversions || conversions.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No conversions tracked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

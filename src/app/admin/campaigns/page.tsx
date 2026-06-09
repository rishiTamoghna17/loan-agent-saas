import { createClient } from "@/lib/supabase/server";
import { CampaignProspectTable } from "@/components/admin/campaign-prospect-table";
import { getCampaignTemplates } from "@/app/admin/actions";

export default async function CampaignsPage() {
  const supabase = createClient();

  const [prospectsResult, templates] = await Promise.all([
    supabase
      .from("prospects")
      .select("*")
      .order("lead_score", { ascending: false }),
    getCampaignTemplates()
  ]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Email Campaigns</h1>
        <p className="text-slate-500">Select prospects and send targeted outreach campaigns.</p>
      </div>

      <CampaignProspectTable 
        prospects={prospectsResult.data || []} 
        customTemplates={templates}
      />
    </div>
  );
}

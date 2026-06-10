import { getCampaignBaseUrl } from "@/lib/campaign-tracking";
import { CampaignsClientWrapper } from "@/components/admin/campaigns-client-wrapper";
import { getCampaignTemplates, getProspects } from "@/app/admin/actions";

export default async function CampaignsPage() {
  const campaignBaseUrl = getCampaignBaseUrl();

  const [prospectsResult, templates] = await Promise.all([
    getProspects({ disablePagination: true, includeEmailHistory: false }),
    getCampaignTemplates()
  ]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Email Campaigns</h1>
        <p className="text-slate-500">Select prospects and send targeted outreach campaigns.</p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <p className="font-semibold text-ink">Active campaign links</p>
        <p className="mt-2 break-all text-slate-600">Demo: {campaignBaseUrl}/demo?prospect_id=PROSPECT_ID</p>
        <p className="mt-1 break-all text-slate-600">Signup: {campaignBaseUrl}/signup</p>
      </div>

      <CampaignsClientWrapper 
        prospects={prospectsResult.prospects} 
        customTemplates={templates}
      />
    </div>
  );
}

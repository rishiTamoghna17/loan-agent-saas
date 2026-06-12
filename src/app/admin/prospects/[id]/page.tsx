import { getProspect, getProspectEmailHistory, getCampaignTemplates } from "@/app/admin/actions";
import { ProspectDetailClient } from "@/components/admin/prospect-detail-client";

export default async function ProspectDetailPage({
  params,
  searchParams
}: { 
  params: { id: string };
  searchParams: Record<string, string | undefined>;
}) {
  const [prospect, emailHistory, customTemplates] = await Promise.all([
    getProspect(params.id),
    getProspectEmailHistory(params.id, {
      status: searchParams.status,
      template: searchParams.template,
      from: searchParams.from,
      to: searchParams.to
    }),
    getCampaignTemplates()
  ]);

  return (
    <ProspectDetailClient 
      prospect={prospect} 
      emailHistory={emailHistory} 
      historyFilters={searchParams}
      customTemplates={customTemplates}
    />
  );
}

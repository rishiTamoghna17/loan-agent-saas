import { getProspect, getProspectEmailHistory } from "@/app/admin/actions";
// Create the missing client component first, then import it. For now, we'll define it inline or update the import path.
// If the component exists in a different location, update the path. For example, if it's in '@/components/prospect-detail-client', use that:
// import { ProspectDetailClient } from "@/components/prospect-detail-client";
// Or create the component file at @/components/admin/prospect-detail-client.tsx with the necessary exports.
// Temporary fix: If the component is meant to be created here's the correct import once the file exists:
import { ProspectDetailClient } from "@/components/admin/prospect-detail-client";

export default async function ProspectDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const prospect = await getProspect(params.id);
  const emailHistory = await getProspectEmailHistory(params.id);

  return (
    <ProspectDetailClient 
      prospect={prospect} 
      emailHistory={emailHistory} 
    />
  );
}

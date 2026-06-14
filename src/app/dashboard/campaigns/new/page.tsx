import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAgentCampaignTemplates, getLeadFolders } from "@/app/dashboard/actions";
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar";
import { DesktopTopBar } from "@/components/dashboard/DesktopTopBar";
import { CreateCampaignClient } from "@/components/dashboard/create-campaign-client";

export default async function NewCampaignPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!agent) redirect("/signup");

  // Fetch all leads, templates, folders parallelly
  const [leadsResult, templates, folders] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("agent_id", agent.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    getAgentCampaignTemplates(),
    getLeadFolders()
  ]);

  const leads = leadsResult.data ?? [];

  const now = new Date();
  const trialEndsAt = new Date(agent.trial_ends_at ?? now.toISOString());
  const trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000));
  const isTrialExpired = agent.plan_status === "expired" || (agent.plan_status === "trial" && trialDaysRemaining <= 0);

  // Extract query parameters
  const queryParams = {
    target: typeof searchParams.target === "string" ? searchParams.target : undefined,
    folderId: typeof searchParams.folderId === "string" ? searchParams.folderId : undefined,
    leadId: typeof searchParams.leadId === "string" ? searchParams.leadId : undefined
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DesktopSidebar
        agent={agent}
        trialDaysRemaining={trialDaysRemaining}
        isTrialExpired={isTrialExpired}
        folders={folders}
        folderId={undefined}
      />

      <div className="flex flex-1 flex-col">
        <DesktopTopBar title="New Campaign" agentSlug={agent.slug} />

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <CreateCampaignClient
            agent={agent}
            leads={leads}
            folders={folders}
            templates={templates}
            isTrialExpired={isTrialExpired}
            queryParams={queryParams}
          />
        </div>
      </div>
    </div>
  );
}

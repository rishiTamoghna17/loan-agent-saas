import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAgentCampaignTemplates, getLeadFolders } from "@/app/dashboard/actions";
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar";
import { DesktopTopBar } from "@/components/dashboard/DesktopTopBar";
import { CampaignTemplatesClient } from "@/components/dashboard/campaign-templates-client";

export default async function CampaignTemplatesPage() {
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

  const [templates, folders] = await Promise.all([
    getAgentCampaignTemplates(),
    getLeadFolders()
  ]);

  const now = new Date();
  const trialEndsAt = new Date(agent.trial_ends_at ?? now.toISOString());
  const trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000));
  const isTrialExpired = agent.plan_status === "expired" || (agent.plan_status === "trial" && trialDaysRemaining <= 0);

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
        <DesktopTopBar title="Templates" agentSlug={agent.slug} />

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <CampaignTemplatesClient
            agent={agent}
            initialTemplates={templates}
            isTrialExpired={isTrialExpired}
          />
        </div>
      </div>
    </div>
  );
}

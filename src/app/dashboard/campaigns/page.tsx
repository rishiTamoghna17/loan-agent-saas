import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeadFolders } from "@/app/dashboard/actions";
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar";
import { DesktopTopBar } from "@/components/dashboard/DesktopTopBar";
import { CampaignsDashboardClient } from "@/components/dashboard/campaigns-dashboard-client";

export default async function CampaignsPage() {
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

  const [leadsResult, campaignsResult, whatsappCampaignsResult, folders] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("agent_id", agent.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("email_campaigns")
      .select("*")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("whatsapp_campaigns")
      .select("*")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false }),
    getLeadFolders()
  ]);

  const leads = leadsResult.data ?? [];
  const campaigns = campaignsResult.data ?? [];
  const whatsappCampaigns = whatsappCampaignsResult.data ?? [];

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

      <div className="flex flex-1 flex-col min-w-0 w-full">
        <DesktopTopBar title="Campaigns" agentSlug={agent.slug} />

        <div className="flex-1 overflow-auto min-w-0 w-full p-4 sm:p-8">
          <CampaignsDashboardClient
            agent={agent}
            leads={leads}
            campaigns={campaigns}
            whatsappCampaigns={whatsappCampaigns}
          />
        </div>
      </div>
    </div>
  );
}

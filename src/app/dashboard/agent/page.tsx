import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar";
import { DesktopTopBar } from "@/components/dashboard/DesktopTopBar";
import { AgentDashboard } from "@/components/dashboard/AgentDashboard";
import { getLeadFolders } from "@/app/dashboard/actions";

export default async function AgentDashboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent } = await supabase.from("agents").select("*").eq("user_id", user.id).single();
  if (!agent) redirect("/signup");

  // Fetch folders and campaign data to properly fill sidebar context
  const [folders] = await Promise.all([
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
      
      <div className="flex flex-1 flex-col min-w-0">
        <DesktopTopBar title="Agent Desk" agentSlug={agent.slug} />
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <AgentDashboard agentId={agent.id} />
        </div>
      </div>
    </div>
  );
}

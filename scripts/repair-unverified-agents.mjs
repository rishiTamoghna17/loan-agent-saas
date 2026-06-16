import { loadLocalEnv } from "./env.mjs";
import { createAdminClient } from "../src/lib/supabase/admin.js";

async function main() {
  loadLocalEnv();
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`Starting agent repair script. Mode: ${isDryRun ? "DRY-RUN (No changes will be written)" : "LIVE"}`);

  const supabase = createAdminClient();

  // 1. Fetch all agents from the database
  const { data: agents, error: fetchError } = await supabase
    .from("agents")
    .select("id, user_id, auth_user_id, agent_name, email, is_active, email_verified");

  if (fetchError) {
    console.error("Failed to fetch agents:", fetchError);
    process.exit(1);
  }

  console.log(`Found ${agents.length} agent record(s) to check.`);

  let repairedCount = 0;
  let healthyCount = 0;
  let missingUserCount = 0;

  for (const agent of agents) {
    const targetUserId = agent.auth_user_id || agent.user_id;
    if (!targetUserId) {
      console.log(`⚠️ Agent [${agent.agent_name}] (${agent.email}) is missing user_id. Deactivating.`);
      if (!isDryRun) {
        await supabase
          .from("agents")
          .update({ is_active: false, email_verified: false })
          .eq("id", agent.id);
      }
      repairedCount++;
      continue;
    }

    // Check auth confirmation status via admin API
    const { data: userData, error: userError } = await supabase.auth.admin.getUser(targetUserId);

    if (userError || !userData?.user) {
      console.log(`⚠️ Auth user NOT found for Agent [${agent.agent_name}] (${agent.email}) [user_id: ${targetUserId}]. Deactivating.`);
      if (!isDryRun) {
        await supabase
          .from("agents")
          .update({ is_active: false, email_verified: false })
          .eq("id", agent.id);
      }
      missingUserCount++;
      repairedCount++;
      continue;
    }

    const user = userData.user;
    const isConfirmed = !!user.email_confirmed_at;

    if (!isConfirmed) {
      // If user email is not confirmed, agent must be inactive and unverified
      if (agent.is_active || agent.email_verified) {
        console.log(`⚠️ Agent [${agent.agent_name}] (${agent.email}) is unverified in Supabase Auth, but active/verified in the DB. Fixing.`);
        if (!isDryRun) {
          await supabase
            .from("agents")
            .update({ is_active: false, email_verified: false })
            .eq("id", agent.id);
        }
        repairedCount++;
      } else {
        healthyCount++;
      }
    } else {
      // If user email IS confirmed, then the DB record should match (be active & email_verified true)
      if (!agent.is_active || !agent.email_verified) {
        console.log(`ℹ️ Agent [${agent.agent_name}] (${agent.email}) is verified in Supabase Auth, but inactive/unverified in DB. Activating/verifying.`);
        if (!isDryRun) {
          await supabase
            .from("agents")
            .update({ is_active: true, email_verified: true })
            .eq("id", agent.id);
        }
        repairedCount++;
      } else {
        healthyCount++;
      }
    }
  }

  console.log("\n--- Execution Summary ---");
  console.log(`Healthy agents: ${healthyCount}`);
  console.log(`Repaired / updated agents: ${repairedCount} (including ${missingUserCount} missing auth users)`);
  console.log(`Done.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

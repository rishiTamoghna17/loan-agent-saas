import { loadLocalEnv } from "./env.mjs";
import { createAdminClient } from "../src/lib/supabase/admin.js";

async function main() {
  loadLocalEnv();
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`Starting pending agent signups cleanup script. Mode: ${isDryRun ? "DRY-RUN" : "LIVE"}`);

  const supabase = createAdminClient();

  // Calculate 48 hours ago
  const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  console.log(`Searching for pending signups created before: ${threshold}`);

  const { data: expiredSignups, error: fetchError } = await supabase
    .from("pending_agent_signups")
    .select("id, email, created_at, status")
    .eq("status", "pending")
    .lt("created_at", threshold);

  if (fetchError) {
    console.error("Failed to fetch pending signups:", fetchError);
    process.exit(1);
  }

  console.log(`Found ${expiredSignups.length} expired pending signup(s).`);

  if (expiredSignups.length === 0) {
    console.log("No cleanups needed.");
    return;
  }

  for (const signup of expiredSignups) {
    console.log(`- Expiring signup [ID: ${signup.id}] (${signup.email}) created at ${signup.created_at}`);
  }

  if (!isDryRun) {
    const ids = expiredSignups.map((s) => s.id);
    const { error: updateError } = await supabase
      .from("pending_agent_signups")
      .update({ status: "expired" })
      .in("id", ids);

    if (updateError) {
      console.error("Failed to update status to expired:", updateError);
      process.exit(1);
    }
    console.log(`Successfully expired ${expiredSignups.length} signup(s) in the database.`);
  } else {
    console.log(`[Dry Run] Would have updated ${expiredSignups.length} signup(s) to 'expired'.`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

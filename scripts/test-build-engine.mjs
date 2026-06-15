import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { generateAgentSite, getWebsiteFile } from "../src/lib/site-builder.ts";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

// Create admin client
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const runId = randomUUID().slice(0, 8);
const password = `TestPass-${runId}-123`;
const email = `test-hugo-agent-${runId}@example.com`;
const slug = `hugo-agent-${runId}`;

let testUserId = null;
let testAgentId = null;

async function run() {
  console.log("Starting build engine integration test...");

  try {
    // 1. Create a confirmed user in Supabase auth
    console.log(`Creating test user: ${email}...`);
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (userError || !userData?.user) {
      throw new Error(`Failed to create test user: ${userError?.message || "unknown error"}`);
    }
    testUserId = userData.user.id;
    console.log(`Created test user with ID: ${testUserId}`);

    // 2. Insert test agent profile
    console.log(`Inserting test agent for user ${testUserId} with slug ${slug}...`);
    const { data: agentData, error: agentError } = await admin
      .from("agents")
      .insert({
        user_id: testUserId,
        business_name: `Hugo Test Agency ${runId}`,
        agent_name: `Marcus Vance ${runId}`,
        phone: "9876543210",
        whatsapp_number: "9876543210",
        email,
        city: "Bengaluru",
        district: "Bengaluru Urban",
        state: "Karnataka",
        pincode: "560001",
        landmark: "Near MG Road",
        slug,
        website_slug: slug,
        description: "Hugo Integration Test Agent Profile"
      })
      .select("*")
      .single();

    if (agentError || !agentData) {
      throw new Error(`Failed to insert test agent: ${agentError?.message || "unknown error"}`);
    }
    testAgentId = agentData.id;
    console.log(`Created test agent with ID: ${testAgentId}`);

    // 3. Build mock data
    const mockAgentData = {
      name: agentData.agent_name,
      bio: "Test Bio: This is a compiled site for the integration test of the dynamic database-backed build engine.",
      contact: {
        phone: "555-123-4567",
        email: email,
        address: "123 Main St, Springfield"
      },
      services: [
        {
          title: "Test Purchase Loan Service",
          description: "Custom rates and personalized loan consulting for home purchases."
        }
      ]
    };

    // 4. Run generateAgentSite
    console.log("Executing generateAgentSite...");
    const publicUrl = await generateAgentSite(testAgentId, mockAgentData);
    console.log("✅ Site generated successfully!");
    console.log("Mock Public URL:", publicUrl);

    // 5. Verify retrieval of index.html using getWebsiteFile helper by ID
    console.log("Testing file retrieval by agent ID...");
    const indexFile = await getWebsiteFile(testAgentId, "id", "index.html");
    if (!indexFile) {
      throw new Error("Could not retrieve index.html from the database!");
    }

    const htmlContent = indexFile.content.toString("utf8");
    console.log(`✅ Successfully retrieved index.html from database! Length: ${htmlContent.length} bytes.`);
    console.log(`✅ index.html contains agent name: ${htmlContent.includes(agentData.agent_name)}`);
    console.log(`✅ index.html MIME Type: ${indexFile.mimeType}`);

    // 6. Verify retrieval by website_slug
    console.log("Testing file retrieval by website_slug...");
    const slugFile = await getWebsiteFile(slug, "slug", "index.html");
    if (!slugFile) {
      throw new Error("Could not retrieve index.html by slug from the database!");
    }
    console.log(`✅ Successfully retrieved index.html by website_slug!`);

    console.log("\n🎉 ALL INTEGRATION TESTS PASSED!");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exitCode = 1;
  } finally {
    console.log("Cleaning up test records...");
    if (testAgentId) {
      await admin.from("agents").delete().eq("id", testAgentId);
    }
    if (testUserId) {
      await admin.auth.admin.deleteUser(testUserId);
    }
    console.log("Clean up finished.");
  }
}

run();

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  fail(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local before running npm run test:db."
  );
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const anon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const runId = randomUUID().slice(0, 8);
const password = `TestPass-${runId}-123`;
const agentAEmail = `agent-a-${runId}@example.com`;
const agentBEmail = `agent-b-${runId}@example.com`;

const createdUserIds = [];
const createdAgentIds = [];
const createdLeadIds = [];

try {
  console.log("Running Supabase DB/RLS integration tests...");

  const userA = await createConfirmedUser(agentAEmail, password);
  const userB = await createConfirmedUser(agentBEmail, password);
  createdUserIds.push(userA.id, userB.id);

  const agentAClient = await signIn(agentAEmail, password);
  const agentBClient = await signIn(agentBEmail, password);

  const agentA = await insertAgent(agentAClient, userA.id, {
    business_name: `Alpha Loans ${runId}`,
    agent_name: "Agent Alpha",
    slug: `alpha-loans-${runId}`
  });
  const agentB = await insertAgent(agentBClient, userB.id, {
    business_name: `Beta Loans ${runId}`,
    agent_name: "Agent Beta",
    slug: `beta-loans-${runId}`
  });
  createdAgentIds.push(agentA.id, agentB.id);

  await assertPublicAgentPagesAreReadable(agentA.slug, agentB.slug);
  await assertAgentCannotCreateProfileForAnotherUser(agentAClient, userB.id);

  const publicLeadForA = await insertPublicLead(agentA.id, `Public Lead A ${runId}`);
  const publicLeadForB = await insertPublicLead(agentB.id, `Public Lead B ${runId}`);
  createdLeadIds.push(publicLeadForA.id, publicLeadForB.id);

  await assertAnonCannotReadLeads();
  await assertTenantLeadIsolation(agentAClient, agentBClient, publicLeadForA.id, publicLeadForB.id);
  await assertTenantLeadMutations(agentAClient, agentBClient, publicLeadForA.id, publicLeadForB.id);
  await assertLeadNotesIsolation(agentAClient, agentBClient, agentA.id, publicLeadForA.id);
  await assertFollowUpIsolation(agentAClient, agentBClient, agentA.id, publicLeadForA.id);
  await assertNotificationPreferenceIsolation(agentAClient, agentBClient, agentA.id, agentB.id);

  console.log("All Supabase DB/RLS tests passed.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await cleanup();
}

async function createConfirmedUser(email, passwordValue) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: passwordValue,
    email_confirm: true
  });

  assertNoError(error, `create test auth user ${email}`);
  assert(data.user, `create test auth user ${email} returned a user`);
  return data.user;
}

async function signIn(email, passwordValue) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await client.auth.signInWithPassword({ email, password: passwordValue });
  assertNoError(error, `sign in ${email}`);
  return client;
}

async function insertAgent(client, userId, values) {
  const { data, error } = await client
    .from("agents")
    .insert({
      user_id: userId,
      business_name: values.business_name,
      agent_name: values.agent_name,
      phone: "9876543210",
      whatsapp_number: "9876543210",
      email: `${values.slug}@example.com`,
      city: "Bengaluru",
      district: "Bengaluru Urban",
      state: "Karnataka",
      pincode: "560001",
      landmark: "Near MG Road",
      slug: values.slug,
      description: "Integration test agent",
      services_offered: ["Personal Loan", "Business Loan"]
    })
    .select("*")
    .single();

  assertNoError(error, `insert own agent profile ${values.slug}`);
  assert(data?.id, `insert own agent profile ${values.slug} returned an id`);
  return data;
}

async function assertPublicAgentPagesAreReadable(slugA, slugB) {
  const { data, error } = await anon.from("agents").select("slug,business_name").in("slug", [slugA, slugB]);

  assertNoError(error, "public can read agent rows for public pages");
  assert(data.length === 2, "public can read both public agent profile rows");
}

async function assertAgentCannotCreateProfileForAnotherUser(client, otherUserId) {
  const { error } = await client.from("agents").insert({
    user_id: otherUserId,
    business_name: `Blocked Loans ${runId}`,
    agent_name: "Blocked Agent",
    phone: "9876543210",
    whatsapp_number: "9876543210",
    email: `blocked-${runId}@example.com`,
    city: "Mumbai",
    district: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    landmark: "Near Fort",
    slug: `blocked-${runId}`,
    services_offered: ["Home Loan"]
  });

  assert(error, "RLS blocks creating an agent profile for another auth user");
}

async function insertPublicLead(agentId, name) {
  const { data, error } = await anon
    .from("leads")
    .insert({
      agent_id: agentId,
      name,
      phone: "9999999999",
      email: `${name.toLowerCase().replaceAll(" ", "-")}@example.com`,
      loan_type: "Personal Loan",
      required_amount: 500000,
      monthly_income: 90000,
      city: "Pune",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      landmark: "Near station",
      message: "Public lead insert test"
    })
    .select("id,agent_id,name,status")
    .single();

  assertNoError(error, `anonymous public lead insert for ${agentId}`);
  assert(data?.status === "new", "new public leads default to new status");
  return data;
}

async function assertAnonCannotReadLeads() {
  const { data, error } = await anon.from("leads").select("id");

  assertNoError(error, "anonymous lead select does not error");
  assert(data.length === 0, "anonymous users cannot read leads");
}

async function assertTenantLeadIsolation(agentAClient, agentBClient, leadAId, leadBId) {
  const { data: leadsA, error: errorA } = await agentAClient.from("leads").select("id").order("created_at");
  const { data: leadsB, error: errorB } = await agentBClient.from("leads").select("id").order("created_at");

  assertNoError(errorA, "agent A can read own leads");
  assertNoError(errorB, "agent B can read own leads");
  assert(leadsA.some((lead) => lead.id === leadAId), "agent A sees own lead");
  assert(!leadsA.some((lead) => lead.id === leadBId), "agent A cannot see agent B lead");
  assert(leadsB.some((lead) => lead.id === leadBId), "agent B sees own lead");
  assert(!leadsB.some((lead) => lead.id === leadAId), "agent B cannot see agent A lead");
}

async function assertTenantLeadMutations(agentAClient, agentBClient, leadAId, leadBId) {
  const { data: updatedOwn, error: updateOwnError } = await agentAClient
    .from("leads")
    .update({ status: "follow_up" })
    .eq("id", leadAId)
    .select("id,status");
  assertNoError(updateOwnError, "agent A can update own lead");
  assert(updatedOwn.length === 1 && updatedOwn[0].status === "follow_up", "agent A own lead status changed");

  const { data: updatedOther, error: updateOtherError } = await agentAClient
    .from("leads")
    .update({ status: "closed" })
    .eq("id", leadBId)
    .select("id,status");
  assertNoError(updateOtherError, "cross-tenant update is filtered by RLS");
  assert(updatedOther.length === 0, "agent A cannot update agent B lead");

  const { data: deletedOther, error: deleteOtherError } = await agentBClient.from("leads").delete().eq("id", leadAId).select("id");
  assertNoError(deleteOtherError, "cross-tenant delete is filtered by RLS");
  assert(deletedOther.length === 0, "agent B cannot delete agent A lead");
}

async function assertLeadNotesIsolation(agentAClient, agentBClient, agentAId, leadAId) {
  const { data: note, error: noteError } = await agentAClient
    .from("lead_notes")
    .insert({
      agent_id: agentAId,
      lead_id: leadAId,
      note: "Follow up tomorrow"
    })
    .select("id,note")
    .single();
  assertNoError(noteError, "agent A can add note to own lead");
  assert(note?.id, "agent A note insert returned an id");

  const { data: notesForB, error: notesForBError } = await agentBClient.from("lead_notes").select("id").eq("id", note.id);
  assertNoError(notesForBError, "agent B lead note query does not error");
  assert(notesForB.length === 0, "agent B cannot read agent A lead note");
}

async function assertFollowUpIsolation(agentAClient, agentBClient, agentAId, leadAId) {
  const { data: task, error } = await agentAClient.from("lead_follow_ups").insert({
    agent_id: agentAId,
    lead_id: leadAId,
    due_at: new Date(Date.now() + 86_400_000).toISOString(),
    note: "Tenant isolation test"
  }).select("id,status").single();
  assertNoError(error, "agent A can schedule own follow-up");
  assert(task?.status === "pending", "new follow-up defaults to pending");

  const { data: otherRead, error: otherReadError } = await agentBClient.from("lead_follow_ups").select("id").eq("id", task.id);
  assertNoError(otherReadError, "cross-tenant follow-up read is filtered by RLS");
  assert(otherRead.length === 0, "agent B cannot read agent A follow-up");

  const { data: otherUpdate, error: otherUpdateError } = await agentBClient.from("lead_follow_ups").update({ status: "completed" }).eq("id", task.id).select("id");
  assertNoError(otherUpdateError, "cross-tenant follow-up update is filtered by RLS");
  assert(otherUpdate.length === 0, "agent B cannot update agent A follow-up");
}

async function assertNotificationPreferenceIsolation(agentAClient, agentBClient, agentAId, agentBId) {
  const { data: own, error: ownError } = await agentAClient.from("agent_notification_preferences").update({
    digest_hour: 11,
    timezone: "Asia/Kolkata"
  }).eq("agent_id", agentAId).select("agent_id,digest_hour");
  assertNoError(ownError, "agent A can update own notification preferences");
  assert(own.length === 1 && own[0].digest_hour === 11, "agent A own notification preferences changed");

  const { data: other, error: otherError } = await agentAClient.from("agent_notification_preferences").update({ digest_hour: 15 }).eq("agent_id", agentBId).select("agent_id");
  assertNoError(otherError, "cross-tenant preference update is filtered by RLS");
  assert(other.length === 0, "agent A cannot update agent B notification preferences");

  const { data: visible, error: visibleError } = await agentBClient.from("agent_notification_preferences").select("agent_id");
  assertNoError(visibleError, "agent B can query notification preferences");
  assert(visible.every((row) => row.agent_id === agentBId), "agent B sees only own notification preferences");
}

async function cleanup() {
  for (const agentId of createdAgentIds) {
    await admin.from("agents").delete().eq("id", agentId);
  }

  for (const userId of createdUserIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}

function assertNoError(error, message) {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }

  console.log(`✓ ${message}`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

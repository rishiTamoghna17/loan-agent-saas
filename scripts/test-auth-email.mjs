import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appHost = (process.env.NEXT_PUBLIC_APP_HOST || "http://localhost:3000").replace(/\/$/, "");
const redirectTo = process.env.AUTH_EMAIL_TEST_REDIRECT_TO || `${appHost}/auth/confirm?next=/dashboard`;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const email = process.env.AUTH_EMAIL_TEST_ADDRESS || `brevo-signup-test-${Date.now()}@example.com`;
const password = `TestPass-${Math.random().toString(36).slice(2)}-123`;
const supabase = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log(`Testing Supabase Auth email handoff with: ${email}`);

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: redirectTo
  }
});

if (error) {
  console.log(`SIGNUP_ERROR_CODE=${error.code || ""}`);
  console.log(`SIGNUP_ERROR_MESSAGE=${error.message}`);
  process.exit(2);
}

console.log(`SIGNUP_OK user_created=${Boolean(data.user)} session_created=${Boolean(data.session)}`);

if (data.user?.id) {
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  console.log(`CLEANUP_USER=${deleteError ? `failed: ${deleteError.message}` : "ok"}`);
}

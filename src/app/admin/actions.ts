"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

async function ensureAdmin() {
  const cookieStore = cookies();
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data?.user || !data.user.email) {
    throw new Error("Unauthorized");
  }

  const user = data.user;
  const email = user.email!;
  
  const rawAdminEmails = process.env.ADMIN_EMAILS;
  if (!rawAdminEmails || !rawAdminEmails.trim()) {
    throw new Error("Server configuration error: ADMIN_EMAILS is not set");
  }

  const adminEmails = rawAdminEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.includes(email.toLowerCase())) {
    throw new Error("Unauthorized");
  }

  // Sync admin emails to database for RLS enforcement (cached via cookie)
  const syncCookie = cookieStore.get("leadhub_admin_synced")?.value;
  
  if (!syncCookie) {
    try {
      const adminClient = createAdminClient();
      const { data: dbAdmins, error: fetchError } = await adminClient.from("admin_users").select("email");
      
      if (fetchError) throw fetchError;
      
      const dbAdminEmails = (dbAdmins || []).map(a => a.email.toLowerCase());
      
      const missingInDb = adminEmails.filter(email => !dbAdminEmails.includes(email));
      if (missingInDb.length > 0) {
        const { error: upsertError } = await adminClient.from("admin_users").upsert(missingInDb.map(email => ({ email })), { onConflict: "email" });
        if (upsertError) throw upsertError;
      }

      // Remove admins that are no longer in the environment variable
      const extraInDb = dbAdminEmails.filter(email => !adminEmails.includes(email));
      if (extraInDb.length > 0) {
        const { error: deleteError } = await adminClient.from("admin_users").delete().in("email", extraInDb);
        if (deleteError) throw deleteError;
      }
      
      // Set a session cookie to avoid re-syncing in this session
      // We use a short maxAge (e.g., 1 hour) to ensure it eventually re-syncs if config changes
      cookieStore.set("leadhub_admin_synced", "true", { 
        maxAge: 3600, 
        path: "/", 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production" 
      });
    } catch (dbError) {
      console.error("Admin Sync Error:", dbError);
      throw new Error("Failed to synchronize admin permissions. Please try again later.");
    }
  }
}

export async function importProspects(prospects: any[]) {
  await ensureAdmin();
  const supabase = createAdminClient();

  // Filter out invalid prospects (e.g. missing email)
  const validProspects = prospects.filter(p => p.email && p.email.includes("@"));

  if (validProspects.length === 0) {
    return { success: false, error: "No valid prospects found in CSV" };
  }

  const { data, error } = await supabase
    .from("prospects")
    .upsert(validProspects, { onConflict: "email" })
    .select();

  if (error) {
    console.error("Import error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/prospects");
  revalidatePath("/admin");
  
  return { success: true, count: data?.length || 0 };
}

export async function updateProspectStatus(id: string, status: string) {
  await ensureAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("prospects")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/admin/prospects");
}

export async function sendCampaignEmail(prospectIds: string[], campaignTemplate: string) {
  await ensureAdmin();
  const supabase = createAdminClient();
  
  // Brevo API Key is often the same as the SMTP Password
  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_PASSWORD;
  const senderEmail = process.env.BREVO_SMTP_SENDER_EMAIL || "hello@leadhub.in";
  const senderName = process.env.BREVO_SMTP_SENDER_NAME || "LeadHub";

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY or BREVO_SMTP_PASSWORD");
    return { success: false, error: "Brevo credentials not configured" };
  }

  // Fetch prospects
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, email, name")
    .in("id", prospectIds);

  if (!prospects || prospects.length === 0) {
    return { success: false, error: "No prospects found" };
  }

  const TEMPLATES: Record<string, { subject: string; content: string }> = {
    intro: {
      subject: "Boost your loan business with LeadHub",
      content: "Hello {{name}}, welcome to LeadHub..."
    },
    demo: {
      subject: "See LeadHub in action - Interactive Demo",
      content: "Hi {{name}}, check out our demo: https://loan-agent-saas.vercel.app/demo?prospect_id={{id}}"
    },
    trial: {
      subject: "Last chance to start your free trial",
      content: "Hi {{name}}, start your trial now: https://loan-agent-saas.vercel.app/signup"
    },
    followup: {
      subject: "Following up on your interest in LeadHub",
      content: "Hi {{name}}, just following up..."
    }
  };

  const template = TEMPLATES[campaignTemplate] || TEMPLATES.intro;
  let successCount = 0;

  for (const prospect of prospects) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": apiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: prospect.email, name: prospect.name }],
          subject: template.subject,
          htmlContent: template.content
            .replace(/\{\{name\}\}/g, prospect.name || "there")
            .replace(/\{\{id\}\}/g, prospect.id),
        })
      });

      if (response.ok) {
        const result = await response.json();
        const messageId = result.messageId;

        // Store campaign activity
        await supabase.from("email_campaigns").insert({
          prospect_id: prospect.id,
          campaign_name: campaignTemplate,
          email_sent_at: new Date().toISOString(),
          message_id: messageId,
          status: "sent"
        });

        // Update prospect status
        await supabase
          .from("prospects")
          .update({ status: "contacted" })
          .eq("id", prospect.id);

        successCount++;
      }
    } catch (error) {
      console.error(`Failed to send email to ${prospect.email}:`, error);
    }
  }

  revalidatePath("/admin/campaigns");
  return { success: true, count: successCount };
}

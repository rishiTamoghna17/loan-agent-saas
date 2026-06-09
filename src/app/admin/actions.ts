"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !user.email) throw new Error("Unauthorized");
  
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email.toLowerCase())) {
    throw new Error("Unauthorized");
  }
}

export async function importProspects(prospects: any[]) {
  await ensureAdmin();
  const supabase = createClient();

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
  const supabase = createClient();
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

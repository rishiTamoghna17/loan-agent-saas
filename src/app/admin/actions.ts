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

export async function addProspect(prospect: any) {
  await ensureAdmin();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("prospects")
    .insert([{
      ...prospect,
      status: prospect.status || "new",
      lead_score: prospect.lead_score || 0
    }])
    .select()
    .single();

  if (error) {
    console.error("Add prospect error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/prospects");
  return { success: true, data };
}

export async function getCampaignTemplates() {
  try {
    await ensureAdmin();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("campaign_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // Log but don't throw to prevent 500 on page load if schema cache is stale
      console.error("Error fetching campaign templates:", error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("Unexpected error in getCampaignTemplates:", error);
    return [];
  }
}

export async function saveCampaignTemplate(template: { name: string; subject: string; content: string; id?: string }) {
  await ensureAdmin();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("campaign_templates")
    .upsert([template])
    .select()
    .single();

  if (error) throw error;
  return { success: true, data };
}

export async function deleteCampaignTemplate(id: string) {
  await ensureAdmin();
  const supabase = createClient();
  const { error } = await supabase
    .from("campaign_templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

export async function getProspects(options: {
  page?: number;
  pageSize?: number;
  status?: string;
  city?: string;
  query?: string;
}) {
  await ensureAdmin();
  const supabase = createClient();
  
  const { 
    page = 1, 
    pageSize = 20, 
    status, 
    city, 
    query 
  } = options;

  let dbQuery = supabase
    .from("prospects")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) dbQuery = dbQuery.eq("status", status);
  if (city) dbQuery = dbQuery.eq("city", city);
  if (query) dbQuery = dbQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await dbQuery.range(from, to);

  if (error) {
    console.error("Error fetching prospects:", error);
    throw new Error(error.message);
  }

  return {
    prospects: data || [],
    count: count || 0,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
    currentPage: page,
    pageSize
  };
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
  const supabase = createClient();
  const adminSupabase = createAdminClient();
  
  // Brevo API Key
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SMTP_SENDER_EMAIL || "hello@leadhub.in";
  const senderName = process.env.BREVO_SMTP_SENDER_NAME || "LeadHub";

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY");
    return { success: false, error: "Brevo API Key not configured" };
  }

  // Fetch prospects using the authenticated client
  const { data: prospects, error: fetchError } = await supabase
    .from("prospects")
    .select("id, email, name")
    .in("id", prospectIds);

  if (fetchError) {
    console.error("Error fetching prospects for campaign:", fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!prospects || prospects.length === 0) {
    console.warn("No prospects found for IDs:", prospectIds);
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

  let template = TEMPLATES[campaignTemplate];

  // If not a hardcoded template, try fetching from database
  if (!template) {
    const { data: customTemplate } = await supabase
      .from("campaign_templates")
      .select("subject, content")
      .eq("id", campaignTemplate)
      .maybeSingle();
    
    if (customTemplate) {
      template = customTemplate;
    }
  }

  if (!template) {
    template = TEMPLATES.intro;
  }

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
          tags: ["campaign", campaignTemplate],
          headers: {
            "X-Mailin-Tag": campaignTemplate
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const messageId = result.messageId;

        // Store campaign activity (using admin client to bypass RLS if needed)
        const { error: campaignError } = await adminSupabase.from("email_campaigns").insert({
          prospect_id: prospect.id,
          campaign_name: campaignTemplate,
          email_sent_at: new Date().toISOString(),
          message_id: messageId,
          status: "sent"
        });

        if (campaignError) {
          console.error(`Error logging campaign for ${prospect.email}:`, campaignError);
        }

        // Update prospect status (using admin client to bypass RLS if needed)
        const { error: prospectError } = await adminSupabase
          .from("prospects")
          .update({ status: "contacted" })
          .eq("id", prospect.id);
        
        if (prospectError) {
          console.error(`Error updating prospect status for ${prospect.email}:`, prospectError);
        }

        successCount++;
      } else {
        const errorData = await response.json();
        console.error(`Brevo API error for ${prospect.email}:`, errorData);
      }
    } catch (error) {
      console.error(`Failed to send email to ${prospect.email}:`, error);
    }
  }

  revalidatePath("/admin/campaigns");
  
  if (successCount === 0 && prospects.length > 0) {
    return { 
      success: false, 
      error: "Failed to send any emails. Check server logs for Brevo API errors.",
      count: 0 
    };
  }

  return { success: true, count: successCount };
}

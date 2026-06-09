import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var loanAgentDbPool: Pool | undefined;
}

type AgentProfileRow = {
  user_id: string;
  business_name: string;
  agent_name: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark: string | null;
  logo_url: string | null;
  slug: string;
  description: string | null;
  services_offered: string[];
  primary_color: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  banner_image_url: string | null;
  custom_domain: string | null;
};

export function getServerDb() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("Missing DATABASE_URL, SUPABASE_DB_URL, or POSTGRES_URL.");
  }

  if (!globalThis.loanAgentDbPool) {
    globalThis.loanAgentDbPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  return globalThis.loanAgentDbPool;
}

export async function insertAgentProfile(row: AgentProfileRow) {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF || getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (accessToken && projectRef) {
    return await insertAgentProfileWithManagementApi(row, accessToken, projectRef);
  }

  return await insertAgentProfileWithPostgres(row);
}

async function insertAgentProfileWithPostgres(row: AgentProfileRow) {
  const result = await getServerDb().query(
    `
      insert into public.agents (
        user_id,
        business_name,
        agent_name,
        phone,
        whatsapp_number,
        email,
        city,
        district,
        state,
        pincode,
        landmark,
        logo_url,
        slug,
        description,
        services_offered,
        primary_color,
        hero_title,
        hero_subtitle,
        banner_image_url,
        custom_domain
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      returning id
    `,
    [
      row.user_id,
      row.business_name,
      row.agent_name,
      row.phone,
      row.whatsapp_number,
      row.email,
      row.city,
      row.district,
      row.state,
      row.pincode,
      row.landmark,
      row.logo_url,
      row.slug,
      row.description,
      row.services_offered,
      row.primary_color,
      row.hero_title,
      row.hero_subtitle,
      row.banner_image_url,
      row.custom_domain
    ]
  );
  return result.rows[0];
}

async function insertAgentProfileWithManagementApi(row: AgentProfileRow, accessToken: string, projectRef: string) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      query: `
        insert into public.agents (
          user_id,
          business_name,
          agent_name,
          phone,
          whatsapp_number,
          email,
          city,
          district,
          state,
          pincode,
          landmark,
          logo_url,
          slug,
          description,
          services_offered,
          primary_color,
          hero_title,
          hero_subtitle,
          banner_image_url,
          custom_domain
        )
        values (
          '${escapeSql(row.user_id)}'::uuid,
          '${escapeSql(row.business_name)}',
          '${escapeSql(row.agent_name)}',
          '${escapeSql(row.phone)}',
          '${escapeSql(row.whatsapp_number)}',
          '${escapeSql(row.email)}',
          '${escapeSql(row.city)}',
          '${escapeSql(row.district)}',
          '${escapeSql(row.state)}',
          '${escapeSql(row.pincode)}',
          ${row.landmark ? `'${escapeSql(row.landmark)}'` : "null"},
          ${row.logo_url ? `'${escapeSql(row.logo_url)}'` : "null"},
          '${escapeSql(row.slug)}',
          ${row.description ? `'${escapeSql(row.description)}'` : "null"},
          array[${row.services_offered.map((service) => `'${escapeSql(service)}'`).join(", ")}]::text[],
          '${escapeSql(row.primary_color)}',
          ${row.hero_title ? `'${escapeSql(row.hero_title)}'` : "null"},
          ${row.hero_subtitle ? `'${escapeSql(row.hero_subtitle)}'` : "null"},
          ${row.banner_image_url ? `'${escapeSql(row.banner_image_url)}'` : "null"},
          ${row.custom_domain ? `'${escapeSql(row.custom_domain)}'` : "null"}
        )
        returning id
      `,
      read_only: false
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const result = await response.json();
  return result[0];
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

function getProjectRefFromUrl(value: string | undefined) {
  if (!value) return "";

  try {
    return new URL(value).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

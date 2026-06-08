import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const migrationsDir = "supabase/migrations";

if (!existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${migrationsDir}`);
  process.exit(1);
}

const migrationPaths = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => `${migrationsDir}/${file}`);

if (!migrationPaths.length) {
  console.error(`No SQL migration files found in ${migrationsDir}.`);
  process.exit(1);
}

if (accessToken && projectRef) {
  for (const migrationPath of migrationPaths) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        query: readFileSync(migrationPath, "utf8"),
        read_only: false
      })
    });

    if (!response.ok) {
      console.error(`Supabase migration ${migrationPath} failed with HTTP ${response.status}.`);
      console.error(await response.text());
      process.exit(1);
    }

    console.log(`Applied ${migrationPath} through the Management API.`);
  }

  console.log(`Applied ${migrationPaths.length} Supabase migration(s) successfully through the Management API.`);
} else if (databaseUrl) {
  const psql = spawn("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", ...migrationPaths.flatMap((path) => ["-f", path])], {
    stdio: "inherit",
    env: process.env
  });

  psql.on("exit", (code) => {
    if (code === 0) {
      console.log(`Applied ${migrationPaths.length} Supabase migration(s) successfully.`);
      return;
    }

    process.exit(code ?? 1);
  });
} else {
  console.error("Missing a supported way to connect to Supabase.");
  console.error("Add DATABASE_URL, SUPABASE_DB_URL, or POSTGRES_URL; or add SUPABASE_ACCESS_TOKEN with SUPABASE_PROJECT_REF/NEXT_PUBLIC_SUPABASE_URL.");
  process.exit(1);
}

function getProjectRefFromUrl(value) {
  if (!value) return "";

  try {
    return new URL(value).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

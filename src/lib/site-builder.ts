import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { createAdminClient } from "./supabase/admin";

const execPromise = promisify(exec);

export interface AgentContact {
  phone?: string;
  email?: string;
  address?: string;
  office?: string;
  facebook?: string;
  linkedin?: string;
  [key: string]: any; // Allow other properties if provided
}

export interface AgentServiceItem {
  title: string;
  description: string;
}

export interface AgentData {
  name: string;
  bio: string;
  contact: AgentContact;
  services: AgentServiceItem[];
}

/**
 * Serializes a JavaScript object/value to YAML format.
 * Uses JSON.stringify for strings to automatically escape quotes and newlines.
 */
export function stringifyYaml(obj: any, indent = 0): string {
  const spaces = " ".repeat(indent);
  if (obj === null || obj === undefined) return "null";
  
  if (typeof obj === "string") {
    return JSON.stringify(obj);
  }
  
  if (typeof obj === "boolean" || typeof obj === "number") {
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const innerYaml = stringifyYaml(item, indent + 2);
          const lines = innerYaml.split("\n");
          // Format first property with '- ', subsequent properties matched to indent
          return `${spaces}- ${lines[0].trim()}\n${lines.slice(1).join("\n")}`;
        } else {
          return `${spaces}- ${stringifyYaml(item, 0)}`;
        }
      })
      .join("\n");
  }
  
  if (typeof obj === "object") {
    return Object.entries(obj)
      .map(([key, val]) => {
        if (val === undefined) return "";
        if (typeof val === "object" && val !== null) {
          if (Array.isArray(val) && val.length === 0) {
            return `${spaces}${key}: []`;
          }
          return `${spaces}${key}:\n${stringifyYaml(val, indent + 2)}`;
        }
        return `${spaces}${key}: ${stringifyYaml(val, 0)}`;
      })
      .filter((line) => line !== "")
      .join("\n");
  }
  
  return "";
}

/**
 * Builds a multi-page static site for an agent using Hugo.
 * 
 * @param agentId The unique identifier of the agent.
 * @param agentData The data object containing agent details.
 * @returns The public URL of the compiled agent site.
 */
export async function generateAgentSite(agentId: string, agentData: AgentData): Promise<string> {
  // Define working directories inside /tmp (always writable, even in Vercel serverless environments)
  const tempDir = path.join("/tmp", "hugo-builds", agentId);
  const destDir = path.join("/tmp", "hugo-outputs", agentId);
  const templateDir = path.join(process.cwd(), "hugo-templates", "default");

  try {
    // 1. Setup Build Directory
    // Ensure clean temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // Copy default Hugo templates structure
    if (!fs.existsSync(templateDir)) {
      throw new Error(`Base Hugo template structure not found at ${templateDir}`);
    }
    fs.cpSync(templateDir, tempDir, { recursive: true });

    // Ensure content directory exists
    const contentDir = path.join(tempDir, "content");
    fs.mkdirSync(contentDir, { recursive: true });

    // 2. Generate Content Files
    // Compile data into front matter for content/_index.md
    const frontMatterObj = {
      name: agentData.name,
      bio: agentData.bio,
      contact: agentData.contact,
      services: agentData.services,
    };

    const indexContent = `---
${stringifyYaml(frontMatterObj)}
---

${agentData.bio}
`;

    fs.writeFileSync(path.join(contentDir, "_index.md"), indexContent, "utf-8");

    // Generate content/about.md page
    const aboutContent = `---
title: "About Me"
layout: "single"
summary: "Learn more about ${agentData.name} and our custom mortgage offerings."
---

# About Me

${agentData.bio}

---

## Direct Contact Information
If you have any questions or are ready to discuss your home loan goals, contact me directly:

- **Email:** ${agentData.contact.email || "N/A"}
- **Phone:** ${agentData.contact.phone || "N/A"}
- **Office Address:** ${agentData.contact.address || "N/A"}
`;

    fs.writeFileSync(path.join(contentDir, "about.md"), aboutContent, "utf-8");

    // Generate content/services.md page
    const servicesListMarkdown = agentData.services
      .map((service) => `### ${service.title}\n${service.description}`)
      .join("\n\n---\n\n");

    const servicesContent = `---
title: "Services Offered"
layout: "single"
summary: "Explore the custom loan programs and mortgage services offered by ${agentData.name}."
---

# Specialized Mortgage Services

We offer a comprehensive suite of financial options tailored specifically for you.

${servicesListMarkdown}
`;

    fs.writeFileSync(path.join(contentDir, "services.md"), servicesContent, "utf-8");

    // Ensure destination directory is clean
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destDir, { recursive: true });

    // 3. Execute Hugo
    // Compile site from temp source folder into destination folder
    const command = `hugo --source "${tempDir}" --destination "${destDir}"`;
    await execPromise(command);

    // 4. Clean up existing files in the database for this agent
    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient
      .from("agent_website_files")
      .delete()
      .eq("agent_id", agentId);

    if (deleteError) {
      throw new Error(`Failed to delete old site files: ${deleteError.message}`);
    }

    // 5. Read all compiled files and upload to the database
    const files = getAllFiles(destDir);
    const records = files.map((file) => {
      const relativePath = path.relative(destDir, file);
      const fileBuffer = fs.readFileSync(file);
      const base64Content = fileBuffer.toString("base64");
      return {
        agent_id: agentId,
        file_path: relativePath,
        file_content: base64Content,
        mime_type: getMimeType(file)
      };
    });

    if (records.length > 0) {
      const { error: insertError } = await adminClient
        .from("agent_website_files")
        .insert(records);

      if (insertError) {
        throw new Error(`Failed to upload compiled files to database: ${insertError.message}`);
      }
    }

    // 6. Optional: Mirror to local filesystem for IDE/local dev inspection
    try {
      const localDestDir = path.join(process.cwd(), "public", "public-sites", agentId);
      if (fs.existsSync(localDestDir)) {
        fs.rmSync(localDestDir, { recursive: true, force: true });
      }
      fs.mkdirSync(localDestDir, { recursive: true });
      fs.cpSync(destDir, localDestDir, { recursive: true });
    } catch (localWriteError) {
      console.warn("Local filesystem mirroring skipped (expected in read-only environment):", localWriteError);
    }

    // 7. Return Public URL
    const baseUrl = process.env.HUGO_BASE_URL || "https://sites.leadhub.com";
    return `${baseUrl}/${agentId}`;

  } catch (error: any) {
    const logs = error.stdout || error.stderr || error.message || String(error);
    throw new Error(`Hugo compilation error:\n${logs}`);
  } finally {
    // Securely delete temporary folders to prevent disk bloating
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error(`Failed to clean up temporary directories:`, cleanupError);
    }
  }
}

// Helper to recursively get all files in a directory
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Map extensions to mime types
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".xml": "application/xml",
    ".txt": "text/plain; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Retrieves a compiled website file from the database.
 */
export async function getWebsiteFile(agentIdentifier: string, type: "slug" | "id", relativeFilePath: string) {
  const adminClient = createAdminClient();
  let agentId = agentIdentifier;

  if (type === "slug") {
    const { data: agent, error: agentError } = await adminClient
      .from("agents")
      .select("id")
      .eq("website_slug", agentIdentifier)
      .single();

    if (agentError || !agent) {
      // Fallback: try checking if it is the agent's old "slug" column
      const { data: agentFallback, error: fallbackError } = await adminClient
        .from("agents")
        .select("id")
        .eq("slug", agentIdentifier)
        .single();

      if (fallbackError || !agentFallback) {
        return null;
      }
      agentId = agentFallback.id;
    } else {
      agentId = agent.id;
    }
  }

  // Retrieve file from database
  const { data: fileRecord, error: fileError } = await adminClient
    .from("agent_website_files")
    .select("file_content, mime_type")
    .eq("agent_id", agentId)
    .eq("file_path", relativeFilePath)
    .single();

  if (fileError || !fileRecord) {
    return null;
  }

  return {
    content: Buffer.from(fileRecord.file_content, "base64"),
    mimeType: fileRecord.mime_type
  };
}

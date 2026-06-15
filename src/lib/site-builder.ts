import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

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
  // Define working directory in /tmp
  const tempDir = path.join("/tmp", "hugo-builds", agentId);
  const templateDir = path.join(process.cwd(), "hugo-templates", "default");

  // Determine final publishing destination
  // We use HUGO_PUBLISH_DIR if defined, or check if /public-sites is writable.
  // If not writable (e.g. on macOS local dev), we fall back to process.cwd() + '/public-sites'
  let destDir = process.env.HUGO_PUBLISH_DIR 
    ? path.join(process.env.HUGO_PUBLISH_DIR, agentId)
    : path.join("/public-sites", agentId);

  // Check write permissions for destDir. Fallback to local workspace if root is not writable
  try {
    const parentDir = path.dirname(destDir);
    fs.mkdirSync(parentDir, { recursive: true });
    // Try creating a temporary directory to verify write permissions
    const testPath = path.join(parentDir, `.write-test-${agentId}`);
    fs.mkdirSync(testPath, { recursive: true });
    fs.rmdirSync(testPath);
  } catch (error) {
    console.warn(`Destination parent directory not writable. Falling back to local workspace directory for local testing.`);
    destDir = path.join(process.cwd(), "public", "public-sites", agentId);
    fs.mkdirSync(path.dirname(destDir), { recursive: true });
  }

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

    // 4. Return Public URL
    const baseUrl = process.env.HUGO_BASE_URL || "https://sites.leadhub.com";
    return `${baseUrl}/${agentId}`;

  } catch (error: any) {
    // Collect output logs if it's a CLI failure
    const logs = error.stdout || error.stderr || error.message || String(error);
    throw new Error(`Hugo compilation error:\n${logs}`);
  } finally {
    // Securely delete temporary folder to prevent disk bloating
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error(`Failed to clean up temporary directory ${tempDir}:`, cleanupError);
    }
  }
}

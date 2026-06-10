import { access, readFile } from "fs/promises";
import path from "path";

export type BrevoAttachment = {
  name: string;
  content: string;
};

export type CampaignAttachmentResult = {
  attachments: BrevoAttachment[];
  metadata: {
    enabled: boolean;
    attached: boolean;
    filename?: string;
    warning?: string;
  };
};

const DEFAULT_BROCHURE_PATH = "artifacts/LeadHub-Loan-Agent-Sales-Brochure.pdf";

export function isCampaignBrochureEnabled() {
  return process.env.CAMPAIGN_ATTACH_BROCHURE !== "false";
}

export function getCampaignBrochurePath() {
  return process.env.CAMPAIGN_BROCHURE_PATH || DEFAULT_BROCHURE_PATH;
}

export function getCampaignBrochureFilename() {
  return path.basename(getCampaignBrochurePath());
}

async function fetchAndEncodePdf(url: string): Promise<BrevoAttachment | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const filename = url.split('/').pop() || 'attachment.pdf';
    return { name: filename, content: base64 };
  } catch (e) {
    console.error("Failed to fetch PDF:", e);
    return null;
  }
}

export async function getCampaignBrochureAttachment(
  templatePdfUrls?: string[] | null
): Promise<CampaignAttachmentResult> {
  if (templatePdfUrls && templatePdfUrls.length > 0) {
    const attachments: BrevoAttachment[] = [];
    for (const url of templatePdfUrls) {
      const attachment = await fetchAndEncodePdf(url);
      if (attachment) {
        attachments.push(attachment);
      }
    }
    
    if (attachments.length > 0) {
      return {
        attachments,
        metadata: { 
          enabled: true, 
          attached: true, 
          filename: attachments.map(a => a.name).join(", ") 
        }
      };
    }
  }

  const enabled = isCampaignBrochureEnabled();
  const configuredPath = getCampaignBrochurePath();
  const absolutePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
  const filename = path.basename(absolutePath);

  if (!enabled) {
    return {
      attachments: [],
      metadata: { enabled: false, attached: false, filename }
    };
  }

  try {
    await access(absolutePath);
    const content = await readFile(absolutePath);
    return {
      attachments: [{ name: filename, content: content.toString("base64") }],
      metadata: { enabled: true, attached: true, filename }
    };
  } catch {
    return {
      attachments: [],
      metadata: {
        enabled: true,
        attached: false,
        filename,
        warning: "Configured campaign brochure file was not found, so the email was sent without an attachment."
      }
    };
  }
}

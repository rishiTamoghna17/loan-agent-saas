import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const LOGO_BUCKET = "agent-logos";
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function uploadAgentLogo(userId: string, file: File) {
  validateLogoFile(file);

  const supabase = createAdminClient();

  return uploadAgentLogoWithClient(supabase, userId, file);
}

export async function uploadAgentLogoWithClient(supabase: SupabaseClient, userId: string, file: File) {
  validateLogoFile(file);

  const extension = getFileExtension(file);
  const filePath = `${userId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function logoFileToDataUrl(file: File) {
  validateLogoFile(file);

  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function uploadLogoDataUrlWithClient(supabase: SupabaseClient, userId: string, dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    throw new Error("Stored logo is not a supported image.");
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  const extension = getExtensionFromMimeType(mimeType);
  const filePath = `${userId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(filePath, buffer, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: true
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

function validateLogoFile(file: File) {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    throw new Error("Please upload a PNG, JPG, WebP, or GIF logo.");
  }

  if (file.size > MAX_LOGO_SIZE) {
    throw new Error("Logo image must be 2 MB or smaller.");
  }
}

function getFileExtension(file: File) {
  const extension = getExtensionFromMimeType(file.type);
  if (extension) return extension;
  return file.name.split(".").pop()?.toLowerCase() || "png";
}

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "";
}

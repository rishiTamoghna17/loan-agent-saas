import { NextResponse } from "next/server";
import { verifyApiAccess } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { uploadAgentLogoWithClient } from "@/lib/logo-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await verifyApiAccess(request);
  if (access.response) {
    return access.response;
  }
  const user = access.user!;

  const formData = await request.formData();
  const file = formData.get("logo_file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Logo image is required." }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const publicUrl = await uploadAgentLogoWithClient(supabase, user.id, file);
    return NextResponse.json({ publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logo upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { uploadAgentLogoWithClient } from "@/lib/logo-upload";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  const {
    data: { user },
    error: userError
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Login is required before uploading a logo." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("logo_file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Logo image is required." }, { status: 400 });
  }

  try {
    const publicUrl = await uploadAgentLogoWithClient(supabase, user.id, file);
    return NextResponse.json({ publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logo upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

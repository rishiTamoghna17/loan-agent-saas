import { redirect } from "next/navigation";
import { ImageUp } from "lucide-react";
import { updateProfile } from "../actions";
import { PincodeAddressFields } from "@/components/address/pincode-address-fields";
import { PhoneWhatsappFields } from "@/components/dashboard/phone-whatsapp-fields";
import { ServicesOfferedFields } from "@/components/dashboard/services-offered-fields";
import { PendingButton } from "@/components/ui/pending-button";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent } = await supabase.from("agents").select("*").eq("user_id", user.id).single();
  if (!agent) redirect("/signup");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="text-3xl font-bold text-ink">Business profile</h1>
      <p className="mt-2 text-slate-600">Changes here update your public page.</p>

      <form action={updateProfile} className="card mt-6 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Business name" name="business_name" defaultValue={agent.business_name} />
          <Field label="Agent name" name="agent_name" defaultValue={agent.agent_name} />
          <Field label="Email" name="email" type="email" defaultValue={agent.email} />
          <PhoneWhatsappFields phone={agent.phone} whatsappNumber={agent.whatsapp_number} />
          <PincodeAddressFields
            required
            initialCity={agent.city}
            initialDistrict={agent.district}
            initialState={agent.state}
            initialPincode={agent.pincode}
          />
          <Field label="Landmark (optional)" name="landmark" defaultValue={agent.landmark ?? ""} />
          <Field label="Logo URL (optional)" name="logo_url" defaultValue={agent.logo_url ?? ""} />
          <Field label="Public slug" name="slug" defaultValue={agent.slug} />
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-ink">Branding</h2>
          <p className="mt-1 text-sm text-slate-600">Make your public page feel unique for your business.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label>
              <span className="label">Primary color</span>
              <input
                name="primary_color"
                type="color"
                className="h-11 w-full rounded-md border border-slate-300 bg-white p-1"
                defaultValue={agent.primary_color ?? "#1769ff"}
              />
            </label>
            <Field label="Banner image URL (optional)" name="banner_image_url" defaultValue={agent.banner_image_url ?? ""} />
            <Field label="Hero title (optional)" name="hero_title" defaultValue={agent.hero_title ?? ""} />
            <Field label="Hero subtitle (optional)" name="hero_subtitle" defaultValue={agent.hero_subtitle ?? ""} />
            <label>
              <span className="label">Custom domain (optional)</span>
              <input name="custom_domain" className="field" placeholder="rahulloans.in" defaultValue={agent.custom_domain ?? ""} />
              <span className="mt-1 block text-xs text-slate-500">
                Status: {(agent.domain_status ?? "not_connected").replace("_", " ")}. Add this later for premium custom domains.
              </span>
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            {agent.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.logo_url} alt={agent.business_name} className="h-28 w-full rounded-md object-contain" />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-md bg-blue-50 text-sm font-semibold text-blue-700">No logo</div>
            )}
          </div>
          <label>
            <span className="label">Upload new logo image</span>
            <div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
              <ImageUp className="h-5 w-5 shrink-0 text-brand-blue" />
              <input
                type="file"
                name="logo_file"
                accept="image/*"
                className="w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </div>
            <span className="mt-1 block text-xs text-slate-500">PNG, JPG, or WebP up to 2 MB. Uploaded image overrides Logo URL.</span>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="label">Description</span>
          <textarea name="description" className="field min-h-28" defaultValue={agent.description ?? ""} />
        </label>

        <div className="mt-4">
          <span className="label">Services offered</span>
          <ServicesOfferedFields selectedServices={agent.services_offered} />
        </div>

        <div className="mt-6">
          <PendingButton pendingText="Saving profile...">Save profile</PendingButton>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text"
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input name={name} type={type} className="field" defaultValue={defaultValue} />
    </label>
  );
}

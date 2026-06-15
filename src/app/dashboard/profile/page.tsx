import { redirect } from "next/navigation";
import { updateNotificationPreferences, updateProfile } from "../actions";
import { PincodeAddressFields } from "@/components/address/pincode-address-fields";
import { PhoneWhatsappFields } from "@/components/dashboard/phone-whatsapp-fields";
import { ServicesOfferedFields } from "@/components/dashboard/services-offered-fields";
import { PendingButton } from "@/components/ui/pending-button";
import { LogoFileInput } from "@/components/ui/logo-file-input";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent } = await supabase.from("agents").select("*").eq("user_id", user.id).single();
  if (!agent) redirect("/signup");
  const { data: preferences } = await supabase
    .from("agent_notification_preferences")
    .select("*")
    .eq("agent_id", agent.id)
    .maybeSingle();

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
          <LogoFileInput name="logo_file" />
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

      <form action={updateNotificationPreferences} className="card mt-6 p-6">
        <h2 className="text-xl font-bold text-ink">Email notifications</h2>
        <p className="mt-1 text-sm text-slate-600">Choose which LeadHub updates arrive in your inbox.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
            <input name="new_lead_email_enabled" type="checkbox" defaultChecked={preferences?.new_lead_email_enabled ?? true} className="mt-1" />
            <span><span className="block font-semibold text-ink">New lead emails</span><span className="text-sm text-slate-500">Receive an email immediately after a new enquiry.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
            <input name="overdue_digest_email_enabled" type="checkbox" defaultChecked={preferences?.overdue_digest_email_enabled ?? true} className="mt-1" />
            <span><span className="block font-semibold text-ink">Overdue follow-up digest</span><span className="text-sm text-slate-500">Receive one daily email with overdue tasks.</span></span>
          </label>
          <label>
            <span className="label">Timezone</span>
            <select name="timezone" className="field" defaultValue={preferences?.timezone ?? "Asia/Kolkata"}>
              <option value="Asia/Kolkata">India - Asia/Kolkata</option>
              <option value="Asia/Dubai">UAE - Asia/Dubai</option>
              <option value="Europe/London">UK - Europe/London</option>
              <option value="America/New_York">US Eastern - America/New_York</option>
            </select>
          </label>
          <label>
            <span className="label">Daily digest hour</span>
            <select name="digest_hour" className="field" defaultValue={String(preferences?.digest_hour ?? 9)}>
              {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}
            </select>
          </label>
        </div>
        <PendingButton className="mt-5 btn-primary" pendingText="Saving notifications...">Save notification settings</PendingButton>
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

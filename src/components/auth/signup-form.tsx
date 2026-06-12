"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { PincodeAddressFields } from "@/components/address/pincode-address-fields";
import { LogoFileInput } from "@/components/ui/logo-file-input";
import { getFriendlyAuthError } from "@/lib/auth-errors";
import { LOAN_PRODUCTS } from "@/lib/constants";
import { createSlug } from "@/lib/format";
import { signupSchema, type SignupInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      business_name: "",
      agent_name: "",
      phone: "",
      whatsapp_number: "",
      email: "",
      password: "",
      city: "",
      district: "",
      state: "",
      pincode: "",
      landmark: "",
      logo_url: "",
      slug: "",
      description: "",
      services_offered: ["Personal Loan", "Business Loan", "Home Loan"],
      primary_color: "#1769ff",
      hero_title: "",
      hero_subtitle: "",
      banner_image_url: "",
      custom_domain: ""
    }
  });
  const businessName = form.watch("business_name");
  const phone = form.watch("phone");
  const slug = form.watch("slug");
  const selectedServices = form.watch("services_offered");

  const suggestedSlug = useMemo(() => createSlug(businessName), [businessName]);
  const allServicesSelected = useMemo(
    () => LOAN_PRODUCTS.every((service) => (selectedServices ?? []).includes(service)),
    [selectedServices]
  );

  function useSuggestedSlug() {
    if (suggestedSlug) form.setValue("slug", suggestedSlug, { shouldValidate: true });
  }

  const syncAddressFields = useCallback(
    (address: { city: string; district: string; state: string; pincode: string }) => {
      form.setValue("city", address.city, { shouldDirty: true, shouldValidate: true });
      form.setValue("district", address.district, { shouldDirty: true, shouldValidate: true });
      form.setValue("state", address.state, { shouldDirty: true, shouldValidate: true });
      form.setValue("pincode", address.pincode, { shouldDirty: true, shouldValidate: true });
    },
    [form]
  );

  useEffect(() => {
    if (sameAsPhone) {
      form.setValue("whatsapp_number", phone, { shouldDirty: true, shouldValidate: true });
    }
  }, [form, phone, sameAsPhone]);

  async function onSubmit(values: SignupInput) {
    setIsSubmitting(true);
    setServerError("");
    setServerMessage("");

    const signupFormData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === "services_offered" && Array.isArray(value)) {
        value.forEach((service) => signupFormData.append("services_offered", service));
        return;
      }

      if (typeof value === "string") {
        signupFormData.append(key, value);
      }
    });

    if (logoFile) {
      signupFormData.append("logo_file", logoFile);
    }

    const response = await fetch("/api/signup", {
      method: "POST",
      body: signupFormData
    });
    const result = (await response.json()) as { error?: string; requiresEmailConfirmation?: boolean; email?: string };

    if (!response.ok) {
      setIsSubmitting(false);
      setServerError(result.error || "Signup failed.");
      return;
    }

    if (result.requiresEmailConfirmation) {
      setIsSubmitting(false);
      setServerMessage(`Account created. Check ${result.email || values.email} and confirm your email to open the dashboard.`);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password
    });

    setIsSubmitting(false);

    if (error) {
      setServerError(getFriendlyAuthError(error));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="card w-full max-w-3xl p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Create agent account</h1>
        <p className="mt-2 text-sm text-slate-600">Your public page and private dashboard are created together.</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Business name" required error={form.formState.errors.business_name?.message}>
          <input className="field" {...form.register("business_name")} />
        </Field>
        <Field label="Agent name" required error={form.formState.errors.agent_name?.message}>
          <input className="field" {...form.register("agent_name")} />
        </Field>
        <Field label="Email" required error={form.formState.errors.email?.message}>
          <input type="email" className="field" {...form.register("email")} />
        </Field>
        <Field label="Password" required error={form.formState.errors.password?.message}>
          <input type="password" className="field" {...form.register("password")} />
        </Field>
        <Field label="Phone" required error={form.formState.errors.phone?.message}>
          <input className="field" {...form.register("phone")} />
        </Field>
        <Field label="WhatsApp number" required error={form.formState.errors.whatsapp_number?.message}>
          <input className="field" readOnly={sameAsPhone} {...form.register("whatsapp_number")} />
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={sameAsPhone}
              onChange={(event) => {
                setSameAsPhone(event.target.checked);
                if (event.target.checked) {
                  form.setValue("whatsapp_number", form.getValues("phone"), { shouldDirty: true, shouldValidate: true });
                }
              }}
            />
            Same as phone number
          </label>
        </Field>
        <PincodeAddressFields
          required
          onAddressChange={syncAddressFields}
          errors={{
            city: form.formState.errors.city?.message,
            district: form.formState.errors.district?.message,
            state: form.formState.errors.state?.message,
            pincode: form.formState.errors.pincode?.message
          }}
        />
        <Field label="Landmark (optional)" error={form.formState.errors.landmark?.message}>
          <input className="field" placeholder="Near bank, market, or main road" {...form.register("landmark")} />
        </Field>
        <Field label="Logo URL (optional)" error={form.formState.errors.logo_url?.message}>
          <input className="field" placeholder="https://..." {...form.register("logo_url")} />
        </Field>
        <LogoFileInput onFileChange={setLogoFile} />
        <Field label="Public slug" required error={form.formState.errors.slug?.message}>
          <div className="flex gap-2">
            <input className="field" {...form.register("slug")} />
            <button type="button" className="btn-secondary shrink-0" onClick={useSuggestedSlug}>Use</button>
          </div>
          {slug ? <p className="mt-1 text-xs text-slate-500">/agent/{slug}</p> : null}
        </Field>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-ink">Agent branding</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Primary color" error={form.formState.errors.primary_color?.message}>
            <input type="color" className="h-11 w-full rounded-md border border-slate-300 bg-white p-1" {...form.register("primary_color")} />
          </Field>
          <Field label="Banner image URL (optional)" error={form.formState.errors.banner_image_url?.message}>
            <input className="field" placeholder="https://..." {...form.register("banner_image_url")} />
          </Field>
          <Field label="Hero title (optional)" error={form.formState.errors.hero_title?.message}>
            <input className="field" placeholder="Need a Home Loan?" {...form.register("hero_title")} />
          </Field>
          <Field label="Hero subtitle (optional)" error={form.formState.errors.hero_subtitle?.message}>
            <input className="field" placeholder="Get approval assistance today." {...form.register("hero_subtitle")} />
          </Field>
          <Field label="Custom domain (optional)" error={form.formState.errors.custom_domain?.message}>
            <input className="field" placeholder="rahulloans.in" {...form.register("custom_domain")} />
            <span className="mt-1 block text-xs text-slate-500">Premium setup later. Your /agent slug works immediately.</span>
          </Field>
        </div>
      </div>

      <Field label="Description" error={form.formState.errors.description?.message} className="mt-4">
        <textarea className="field min-h-24" {...form.register("description")} />
      </Field>

      <div className="mt-4">
        <span className="label">Services offered <span className="text-red-600">*</span></span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex items-center gap-2 rounded-md border border-brand-blue bg-blue-50 p-3 text-sm font-semibold text-brand-blue">
            <input
              type="checkbox"
              checked={allServicesSelected}
              onChange={(event) => {
                form.setValue("services_offered", event.target.checked ? [...LOAN_PRODUCTS] : [], {
                  shouldDirty: true,
                  shouldValidate: true
                });
              }}
            />
            All services
          </label>
          {LOAN_PRODUCTS.map((service) => (
            <label key={service} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm">
              <input type="checkbox" value={service} {...form.register("services_offered")} />
              {service}
            </label>
          ))}
        </div>
        <p className="mt-1 text-sm text-red-600">{form.formState.errors.services_offered?.message}</p>
      </div>

      {serverMessage ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{serverMessage}</p> : null}
      {serverError ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</p> : null}

      <button type="submit" className="btn-primary mt-6 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {isSubmitting ? "Creating..." : "Create account and profile"}
      </button>
    </form>
  );
}

function Field({
  label,
  required = false,
  error,
  children,
  className = ""
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      {children}
      <span className="mt-1 block text-sm text-red-600">{error}</span>
    </label>
  );
}

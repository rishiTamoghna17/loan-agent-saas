"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight, Lock, Eye, EyeOff, User, Phone, MapPin, UserPlus, Laptop, Globe } from "lucide-react";
import { PincodeAddressFields } from "@/components/address/pincode-address-fields";
import { getFriendlyAuthError } from "@/lib/auth-errors";
import { createSlug } from "@/lib/format";
import { signupSchema, type SignupInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      slug: ""
    }
  });

  const businessName = form.watch("business_name");
  const phone = form.watch("phone");

  const suggestedSlug = useMemo(() => createSlug(businessName), [businessName]);

  useEffect(() => {
    let generatedSlug = suggestedSlug;
    if (generatedSlug.length < 3) {
      generatedSlug = (generatedSlug + "-slug").slice(0, 80);
    }
    if (generatedSlug.length < 3) {
      generatedSlug = "agent";
    }
    form.setValue("slug", generatedSlug, { shouldDirty: true, shouldValidate: true });
  }, [form, suggestedSlug]);

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

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const result = (await response.json()) as {
        status?: string;
        code?: string;
        message?: string;
        error?: string;
        retry_after?: number;
      };

      if (!response.ok) {
        setIsSubmitting(false);
        if (result.code === "ACCOUNT_ALREADY_EXISTS") {
          setServerError(result.message || "An account already exists with this email. Please sign in.");
        } else if (result.code === "RESEND_COOLDOWN") {
          setServerError(result.message || "Please wait before requesting another verification email.");
        } else {
          setServerError(result.error || result.message || "Signup failed.");
        }
        return;
      }

      if (result.status === "VERIFICATION_REQUIRED" || result.status === "VERIFICATION_RESENT") {
        setIsSubmitting(false);
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }

      // Fallback fallback signin if verification is not needed (though by default it is)
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

      router.push("/dashboard/website?welcome=true");
      router.refresh();
    } catch (e) {
      setIsSubmitting(false);
      setServerError("An error occurred during signup. Please try again.");
    }
  }

  const inputClass = "w-full h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 placeholder-slate-400 text-slate-900";

  return (
    <div className="w-full max-w-[1000px] bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row shadow-sm min-h-[650px] mx-auto">
      {/* Left information panel — 32% width */}
      <div className="md:w-[32%] w-full bg-gradient-to-b from-blue-50 to-blue-100/30 p-8 flex flex-col justify-between border-r border-slate-100 hidden md:flex select-none">
        <div>
          {/* Product logo */}
          <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xl mb-12">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-black">L</div>
            LeadHub
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Create your agent account</h2>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">
            Set up your account now. You can design your public website after registration.
          </p>
        </div>

        {/* Benefits list */}
        <div className="space-y-6 my-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Create your account</p>
              <p className="text-[10px] text-slate-500">Provide basic details</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
              <Laptop className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Build your website</p>
              <p className="text-[10px] text-slate-500">Customize templates & info</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Publish and share</p>
              <p className="text-[10px] text-slate-500">Get leads automatically</p>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400">
          © {new Date().getFullYear()} LeadHub. All rights reserved.
        </div>
      </div>

      {/* Right form panel — 68% width */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="md:w-[68%] w-full bg-white p-6 md:p-8 flex flex-col justify-between">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xl mb-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-black">L</div>
            LeadHub
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center">Create your agent account</h1>
          <p className="text-xs text-slate-500 text-center mt-1">
            Set up your account now. You can design your public website after registration.
          </p>
        </div>

        <div>
          <div className="hidden md:block mb-6">
            <h1 className="text-xl font-bold text-slate-900">Account information</h1>
            <p className="text-xs text-slate-500 mt-1">Enter your basic business and contact details.</p>
          </div>

          {/* Section: Account Details */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              <User className="h-4 w-4" />
              <span>Account details</span>
            </div>
            <div className="h-[1px] bg-slate-100 w-full mb-4" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Business name" required error={form.formState.errors.business_name?.message}>
                <input className={inputClass} placeholder="e.g. Acme Loans" {...form.register("business_name")} />
              </Field>

              <Field label="Agent full name" required error={form.formState.errors.agent_name?.message}>
                <input className={inputClass} placeholder="e.g. John Doe" {...form.register("agent_name")} />
              </Field>

              <Field label="Email address" required error={form.formState.errors.email?.message}>
                <input type="email" className={inputClass} placeholder="john@example.com" autoComplete="username" {...form.register("email")} />
              </Field>

              <Field label="Password" required error={form.formState.errors.password?.message}>
                <div className="relative flex items-center rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-600 h-12">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full h-full px-4 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none pr-12 rounded-lg"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600 focus:text-slate-700 hover:bg-slate-50 focus:bg-slate-50 rounded-md focus:outline-none transition-colors z-10 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {/* Section: Contact Details */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              <Phone className="h-4 w-4" />
              <span>Contact details</span>
            </div>
            <div className="h-[1px] bg-slate-100 w-full mb-4" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone number" required error={form.formState.errors.phone?.message}>
                <div className="relative flex items-center rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-600 overflow-hidden h-12">
                  <span className="flex items-center justify-center px-3 text-sm font-medium text-slate-500 border-r border-slate-200 bg-slate-50 h-full select-none">
                    +91
                  </span>
                  <input 
                    className="w-full h-full px-3 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none" 
                    type="tel"
                    maxLength={10}
                    placeholder="9999999999"
                    inputMode="numeric"
                    {...form.register("phone", {
                      onChange: (e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        form.setValue("phone", val, { shouldDirty: true, shouldValidate: true });
                        if (sameAsPhone) {
                          form.setValue("whatsapp_number", val, { shouldDirty: true, shouldValidate: true });
                        }
                      }
                    })} 
                  />
                </div>
              </Field>

              <Field label="WhatsApp number" required error={form.formState.errors.whatsapp_number?.message}>
                <div className="flex flex-col w-full">
                  <div className="relative flex items-center rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-600 overflow-hidden h-12">
                    <span className="flex items-center justify-center px-3 text-sm font-medium text-slate-500 border-r border-slate-200 bg-slate-50 h-full select-none">
                      +91
                    </span>
                    <input 
                      className={`w-full h-full px-3 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none ${sameAsPhone ? "text-slate-505 bg-slate-50 cursor-not-allowed text-slate-500" : ""}`} 
                      type="tel"
                      maxLength={10}
                      placeholder="9999999999"
                      inputMode="numeric"
                      readOnly={sameAsPhone} 
                      {...form.register("whatsapp_number", {
                        onChange: (e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          form.setValue("whatsapp_number", val, { shouldDirty: true, shouldValidate: true });
                        }
                      })} 
                    />
                  </div>
                  <label className="mt-2.5 flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-350 text-blue-600 focus:ring-blue-500"
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
                </div>
              </Field>
            </div>
          </div>

          {/* Section: Location */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              <MapPin className="h-4 w-4" />
              <span>Location</span>
            </div>
            <div className="h-[1px] bg-slate-100 w-full mb-4" />

            <div className="grid gap-4 md:grid-cols-2">
              <PincodeAddressFields
                required
                useSearchableState={true}
                inputClassName={inputClass}
                onAddressChange={syncAddressFields}
                errors={{
                  city: form.formState.errors.city?.message,
                  district: form.formState.errors.district?.message,
                  state: form.formState.errors.state?.message,
                  pincode: form.formState.errors.pincode?.message
                }}
              />
            </div>
            
            <div className="mt-2 w-full">
              <Field label="Landmark (optional)" error={form.formState.errors.landmark?.message}>
                <input className={inputClass} placeholder="Near bank, market, or main road" {...form.register("landmark")} />
              </Field>
            </div>
          </div>
        </div>

        {serverMessage ? <p className="mb-4 rounded-lg bg-emerald-50 p-4 text-xs text-emerald-700 font-medium">{serverMessage}</p> : null}
        {serverError ? <p className="mb-4 rounded-lg bg-red-50 p-4 text-xs text-red-700 font-medium">{serverError}</p> : null}

        {/* Footer actions */}
        <div className="border-t border-slate-100 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link href="/login" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
              Already have an account? Sign in
            </Link>

            <button
              type="submit"
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-full sm:w-auto min-h-[44px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5 text-slate-350" />
            <span>Your information is secure and will not be shared.</span>
          </div>
        </div>
      </form>
    </div>
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
    <div className={`flex flex-col ${className}`}>
      <span className="mb-1.5 text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
      <div className="min-h-[20px] mt-1">
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}

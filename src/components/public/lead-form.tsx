"use client";

import { useCallback, useState } from "react";
import type { FieldErrors, FieldPath, UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Mail, Phone, Send } from "lucide-react";
import { PincodeAddressFields } from "@/components/address/pincode-address-fields";
import { LEAD_SOURCES, LOAN_PRODUCTS, SUPPORT_CONTACT } from "@/lib/constants";
import { leadSchema, type LeadInput } from "@/lib/schemas";

export function LeadForm({ 
  agentId, 
  isTrialExpired = false,
  agentName = ""
}: { 
  agentId: string
  isTrialExpired?: boolean
  agentName?: string
}) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      loan_type: "Personal Loan",
      required_amount: 100000,
      monthly_income: "",
      city: "",
      district: "",
      state: "",
      pincode: "",
      landmark: "",
      source: "Website",
      message: ""
    }
  });

  const syncAddressFields = useCallback(
    (address: { city: string; district: string; state: string; pincode: string }) => {
      const shouldValidate = form.formState.isSubmitted;
      form.setValue("city", address.city, { shouldDirty: true, shouldValidate });
      form.setValue("district", address.district, { shouldDirty: true, shouldValidate });
      form.setValue("state", address.state, { shouldDirty: true, shouldValidate });
      form.setValue("pincode", address.pincode, { shouldDirty: true, shouldValidate });
    },
    [form]
  );

  const errors = getVisibleErrors(form);

  async function onSubmit(values: LeadInput) {
    setIsSubmitting(true);
    setMessage("");
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
      agent_id: agentId,
      name: values.name,
      phone: values.phone,
      email: values.email || null,
      loan_type: values.loan_type,
      required_amount: Number(values.required_amount),
      monthly_income: values.monthly_income === "" || values.monthly_income == null ? null : Number(values.monthly_income),
      city: values.city,
      district: values.district,
      state: values.state,
      pincode: values.pincode,
      landmark: values.landmark || null,
      source: values.source,
      message: values.message || null
      })
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result.error || "Could not submit the lead.");
      return;
    }

    form.reset();
    setMessage("Thank you. The agent will contact you soon.");
  }

  return (
    <div>
      {isTrialExpired ? (
        <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-5 text-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Lead capture is currently disabled.</p>
              <p className="mt-2 text-sm">
                {agentName ? `${agentName}'s` : "This agent's"} trial has ended. To reactivate lead capture and continue growing your business, contact support:
              </p>
              <div className="mt-3 space-y-1">
                <a href={`tel:${SUPPORT_CONTACT.phone}`} className="flex items-center gap-2 text-sm hover:underline">
                  <Phone className="h-4 w-4" />
                  {SUPPORT_CONTACT.phone}
                </a>
                <a href={`mailto:${SUPPORT_CONTACT.email}`} className="flex items-center gap-2 text-sm hover:underline">
                  <Mail className="h-4 w-4" />
                  {SUPPORT_CONTACT.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <form onSubmit={form.handleSubmit(onSubmit)} className="card p-5">
        <h2 className="text-xl font-bold text-ink">Apply now</h2>
        <p className="mt-1 text-sm text-slate-600">Share your requirement and get a quick callback.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Name" error={errors.name}>
            <input className="field" {...form.register("name")} disabled={isTrialExpired} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input 
              className="field" 
              type="tel"
              maxLength={10}
              inputMode="numeric"
              {...form.register("phone", {
                onChange: (e) => {
                  // Keep only digits and restrict to 10
                  const phone = e.target.value.replace(/\D/g, '').slice(0, 10);
                  form.setValue("phone", phone, { shouldDirty: true, shouldValidate: true });
                }
              })} 
              disabled={isTrialExpired} 
            />
          </Field>
          <Field label="Email (optional)" error={errors.email}>
            <input className="field" type="email" {...form.register("email")} disabled={isTrialExpired} />
          </Field>
          <Field label="Loan type" error={errors.loan_type}>
            <select className="field" {...form.register("loan_type")} disabled={isTrialExpired}>
              {LOAN_PRODUCTS.map((product) => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </Field>
          <Field label="Required amount" error={errors.required_amount}>
            <input className="field" type="number" {...form.register("required_amount")} disabled={isTrialExpired} />
          </Field>
          <Field label="Monthly income (optional)" error={errors.monthly_income}>
            <input className="field" type="number" {...form.register("monthly_income")} disabled={isTrialExpired} />
          </Field>
          <Field label="Lead source" error={errors.source}>
            <select className="field" {...form.register("source")} disabled={isTrialExpired}>
              {LEAD_SOURCES.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </Field>
          <PincodeAddressFields
            required
            onAddressChange={syncAddressFields}
            errors={{
              city: errors.city,
              district: errors.district,
              state: errors.state,
              pincode: errors.pincode
            }}
            disabled={isTrialExpired}
          />
          <Field label="Landmark (optional)" error={errors.landmark}>
            <input className="field" placeholder="Near bank, market, or main road" {...form.register("landmark")} disabled={isTrialExpired} />
          </Field>
        </div>

        <Field label="Message (optional)" error={errors.message} className="mt-4">
          <textarea className="field min-h-24" {...form.register("message")} disabled={isTrialExpired} />
        </Field>

        {message ? (
          <p className={`mt-4 rounded-md p-3 text-sm ${message.startsWith("Thank") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message}
          </p>
        ) : null}

        <button type="submit" className="btn-primary mt-5 w-full" disabled={isSubmitting || isTrialExpired}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isSubmitting ? "Submitting..." : "Submit enquiry"}
        </button>
      </form>
    </div>
  );
}

function getVisibleErrors(form: UseFormReturn<LeadInput>) {
  const fields: FieldPath<LeadInput>[] = [
    "name",
    "phone",
    "email",
    "loan_type",
    "required_amount",
    "monthly_income",
    "city",
    "district",
    "state",
    "pincode",
    "landmark",
    "source",
    "message"
  ];
  const visibleErrors: Partial<Record<FieldPath<LeadInput>, string>> = {};

  fields.forEach((field) => {
    if (!shouldShowError(form, field)) return;
    const error = form.formState.errors[field as keyof FieldErrors<LeadInput>];
    if (error?.message) visibleErrors[field] = String(error.message);
  });

  return visibleErrors;
}

function shouldShowError(form: UseFormReturn<LeadInput>, field: FieldPath<LeadInput>) {
  return form.formState.isSubmitted;
}

function Field({
  label,
  error,
  children,
  className = ""
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
      <span className="mt-1 block text-sm text-red-600">{error}</span>
    </label>
  );
}

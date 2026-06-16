import { z } from "zod";
import { LEAD_SOURCES, LEAD_STATUSES, LOAN_PRODUCTS } from "./constants";

const phoneSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number")
  .max(15, "Enter a valid phone number")
  .regex(/^[0-9+\-\s()]+$/, "Use numbers only");

const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, "Enter a valid 6 digit pincode");

const optionalText = (max: number) =>
  z.preprocess((value) => (value == null ? "" : value), z.string().trim().max(max).optional().or(z.literal("")));

const optionalEmail = z.preprocess(
  (value) => (value == null ? "" : value),
  z.string().trim().email("Enter a valid email").optional().or(z.literal(""))
);

const optionalNumber = z.preprocess(
  (value) => (value == null ? "" : value),
  z.coerce.number().min(0).max(100000000).optional().or(z.literal(""))
);

export const profileSchema = z.object({
  business_name: z.string().trim().min(2, "Business name is required").max(100),
  agent_name: z.string().trim().min(2, "Agent name is required").max(100),
  phone: phoneSchema,
  whatsapp_number: phoneSchema,
  email: z.string().trim().email("Enter a valid email"),
  city: z.string().trim().min(2, "City is required").max(80),
  district: z.string().trim().min(2, "District is required").max(80),
  state: z.string().trim().min(2, "State is required").max(80),
  pincode: pincodeSchema,
  landmark: optionalText(120),
  logo_url: z.preprocess((value) => (value == null ? "" : value), z.string().trim().url("Enter a valid URL").optional().or(z.literal(""))),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  description: optionalText(600),
  services_offered: z.array(z.enum(LOAN_PRODUCTS)).min(1, "Select at least one service"),
  primary_color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Choose a valid color")
    .default("#1769ff"),
  hero_title: optionalText(120),
  hero_subtitle: optionalText(240),
  banner_image_url: z.preprocess((value) => (value == null ? "" : value), z.string().trim().url("Enter a valid URL").optional().or(z.literal(""))),
  custom_domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .regex(/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/, "Enter a valid domain")
    .optional()
    .or(z.literal(""))
});

export const signupSchema = z.object({
  business_name: z.string().trim().min(2, "Business name is required").max(100),
  agent_name: z.string().trim().min(2, "Agent name is required").max(100),
  phone: phoneSchema,
  whatsapp_number: phoneSchema,
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  city: z.string().trim().min(2, "City is required").max(80),
  district: z.string().trim().min(2, "District is required").max(80),
  state: z.string().trim().min(2, "State is required").max(80),
  pincode: pincodeSchema,
  landmark: optionalText(120),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required")
});

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: phoneSchema,
  email: optionalEmail,
  loan_type: z.enum(LOAN_PRODUCTS),
  required_amount: z.coerce.number().min(1000, "Enter a valid amount").max(100000000),
  monthly_income: optionalNumber,
  city: z.string().trim().min(2, "City is required").max(80),
  district: z.string().trim().min(2, "District is required").max(80),
  state: z.string().trim().min(2, "State is required").max(80),
  pincode: pincodeSchema,
  landmark: optionalText(120),
  source: z.enum(LEAD_SOURCES).default("Website"),
  message: optionalText(800)
});

export const leadStatusSchema = z.object({
  lead_id: z.string().uuid(),
  status: z.enum(LEAD_STATUSES)
});

export const leadNoteSchema = z.object({
  lead_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  note: z.string().trim().min(2, "Note is required").max(800)
});

export const deleteLeadSchema = z.object({
  lead_id: z.string().uuid()
});

export const followUpSchema = z.object({
  id: z.string().uuid().optional(),
  lead_id: z.string().uuid(),
  due_at: z.string().datetime({ offset: true }),
  note: optionalText(800)
});

export const followUpStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "completed", "cancelled"])
});

export const notificationPreferencesSchema = z.object({
  timezone: z.string().trim().min(1).max(80).refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid timezone"),
  new_lead_email_enabled: z.boolean(),
  overdue_digest_email_enabled: z.boolean(),
  digest_hour: z.coerce.number().int().min(0).max(23)
});

export const analyticsEventSchema = z.object({
  agent_id: z.string().uuid(),
  lead_id: z.string().uuid().optional().nullable(),
  event_type: z.enum(["website_visit", "lead_submission", "whatsapp_click"]),
  metadata: z.record(z.unknown()).optional()
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LeadInput = z.infer<typeof leadSchema>;

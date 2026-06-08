export const LOAN_PRODUCTS = [
  "Personal Loan",
  "Business Loan",
  "Home Loan",
  "Loan Against Property",
  "Gold Loan",
  "Car Loan",
  "Used Car Loan",
  "Two Wheeler Loan",
  "Education Loan",
  "Vehicle Loan",
  "Commercial Vehicle Loan",
  "Working Capital Loan",
  "Machinery Loan",
  "MSME Loan",
  "Overdraft Facility",
  "Balance Transfer",
  "Credit Card",
  "Insurance"
] as const;

export const LEAD_STATUSES = ["new", "follow_up", "closed", "rejected"] as const;

export const LEAD_SOURCES = ["Website", "WhatsApp", "Facebook", "Instagram", "Google", "Referral"] as const;

export const STATUS_LABELS: Record<(typeof LEAD_STATUSES)[number], string> = {
  new: "New",
  follow_up: "Follow-up",
  closed: "Closed",
  rejected: "Rejected"
};

export const PLAN_STATUSES = ["trial", "active", "expired", "cancelled"] as const;

export const SUPPORT_CONTACT = {
  phone: "7001586476",
  email: "tamoghna171099@gmail.com"
} as const;

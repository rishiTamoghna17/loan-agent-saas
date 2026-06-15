import { useState, useEffect, useCallback } from "react";

export type PersonaType = "loans" | "retail" | "marketing";

export interface DashboardMetric {
  label: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  tooltip: string;
}

export interface CampaignData {
  id: string;
  name: string;
  channel: "email" | "whatsapp";
  audienceSize: number;
  status: "sent" | "sending" | "failed";
  openRate: number; // For email open, for whatsapp read
  clickRate: number;
  sentAt: string;
}

export interface LeadData {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "new" | "in_progress" | "converted";
  lastContacted: string;
  details: string;
  documents?: string[];
}

export interface LiveFeedEvent {
  id: string;
  leadName: string;
  action: string;
  timeAgo: string;
  channel: "email" | "whatsapp";
  timestamp: Date;
}

// Industry-specific mock data generators
const mockCampaigns: Record<PersonaType, CampaignData[]> = {
  loans: [
    { id: "c-l1", name: "Q2 Home Loan Lowest Interest Rates", channel: "email", audienceSize: 1250, status: "sent", openRate: 64, clickRate: 18, sentAt: "2 hours ago" },
    { id: "c-l2", name: "WhatsApp Welcome Follow-up (Gold Loan)", channel: "whatsapp", audienceSize: 420, status: "sent", openRate: 92, clickRate: 45, sentAt: "5 hours ago" },
    { id: "c-l3", name: "Personal Loan Instant Pre-Approval Offer", channel: "email", audienceSize: 3100, status: "sending", openRate: 28, clickRate: 8, sentAt: "Just now" },
    { id: "c-l4", name: "Business Expansion Loan Special Rates", channel: "whatsapp", audienceSize: 850, status: "sent", openRate: 88, clickRate: 31, sentAt: "1 day ago" }
  ],
  retail: [
    { id: "c-r1", name: "VIP Early Summer Collection Access", channel: "email", audienceSize: 4500, status: "sent", openRate: 52, clickRate: 24, sentAt: "3 hours ago" },
    { id: "c-r2", name: "WhatsApp Flash Coupon 20% OFF", channel: "whatsapp", audienceSize: 1800, status: "sent", openRate: 95, clickRate: 58, sentAt: "6 hours ago" },
    { id: "c-r3", name: "Loyalty Program Points Statement", channel: "email", audienceSize: 12000, status: "sending", openRate: 15, clickRate: 4, sentAt: "Sending now" },
    { id: "c-r4", name: "Abandoned Cart Reminder Alert", channel: "whatsapp", audienceSize: 350, status: "sent", openRate: 89, clickRate: 42, sentAt: "1 day ago" }
  ],
  marketing: [
    { id: "c-m1", name: "Free SEO Audit & Review Pitch", channel: "email", audienceSize: 340, status: "sent", openRate: 48, clickRate: 22, sentAt: "4 hours ago" },
    { id: "c-m2", name: "WhatsApp Q3 Ad Spend Review Booking", channel: "whatsapp", audienceSize: 120, status: "sent", openRate: 91, clickRate: 65, sentAt: "8 hours ago" },
    { id: "c-m3", name: "Inbound Marketing Playbook PDF Download", channel: "email", audienceSize: 1500, status: "sent", openRate: 38, clickRate: 14, sentAt: "Yesterday" },
    { id: "c-m4", name: "Social Commerce Case Study Teaser", channel: "whatsapp", audienceSize: 210, status: "sent", openRate: 85, clickRate: 39, sentAt: "2 days ago" }
  ]
};

const mockLeads: Record<PersonaType, LeadData[]> = {
  loans: [
    { id: "l-l1", name: "Anjali Gupta", email: "anjali.g@example.com", phone: "+91 98765 43210", status: "new", lastContacted: "10 mins ago", details: "Home Loan · ₹45L", documents: ["secured-docs/agent-123/lead-l1/income_proof.pdf", "secured-docs/agent-123/lead-l1/pan_card.jpg"] },
    { id: "l-l2", name: "Rohan Malhotra", email: "rohan.m@example.com", phone: "+91 99988 77766", status: "in_progress", lastContacted: "2 hours ago", details: "Business Loan · ₹25L", documents: ["secured-docs/agent-123/lead-l2/itr_receipt.pdf"] },
    { id: "l-l3", name: "Pooja Hegde", email: "pooja.h@example.com", phone: "+91 91234 56789", status: "converted", lastContacted: "1 day ago", details: "Car Loan · ₹12L" },
    { id: "l-l4", name: "Vikram Rathore", email: "vikram.r@example.com", phone: "+91 98888 11111", status: "in_progress", lastContacted: "2 days ago", details: "Gold Loan · ₹8L" },
    { id: "l-l5", name: "Sneha Nair", email: "sneha.n@example.com", phone: "+91 97777 66666", status: "new", lastContacted: "3 days ago", details: "Education Loan · ₹15L" }
  ],
  retail: [
    { id: "l-r1", name: "David Miller", email: "david.m@example.com", phone: "+1 (555) 019-2834", status: "new", lastContacted: "12 mins ago", details: "Loyalty Tier Update · Fashion" },
    { id: "l-r2", name: "Emma Watson", email: "emma.w@example.com", phone: "+1 (555) 014-9988", status: "in_progress", lastContacted: "3 hours ago", details: "Custom Dress Order · Bridal" },
    { id: "l-r3", name: "James Smith", email: "james.s@example.com", phone: "+1 (555) 017-3344", status: "converted", lastContacted: "Yesterday", details: "Bulk Order Gift Hampers · ₹50k" },
    { id: "l-r4", name: "Sophia Martinez", email: "sophia.m@example.com", phone: "+1 (555) 018-7766", status: "in_progress", lastContacted: "2 days ago", details: "Store Credit Dispute" },
    { id: "l-r5", name: "Oliver Taylor", email: "oliver.t@example.com", phone: "+1 (555) 015-1122", status: "new", lastContacted: "4 days ago", details: "Pre-order Reservation" }
  ],
  marketing: [
    { id: "l-m1", name: "Sarah Jenkins", email: "sjenkins@acmecorp.com", phone: "+44 7911 123456", status: "new", lastContacted: "5 mins ago", details: "SEO Retainer Pitch · $3k/mo" },
    { id: "l-m2", name: "Marcus Aurelius", email: "marcus@romeconsulting.io", phone: "+44 7911 987654", status: "in_progress", lastContacted: "4 hours ago", details: "PPC Campaign Audit · E-commerce" },
    { id: "l-m3", name: "Elena Rostova", email: "elena@startupgrow.net", phone: "+44 7911 654321", status: "converted", lastContacted: "Yesterday", details: "Branding Project · $15k Fixed" },
    { id: "l-m4", name: "Alistair Cook", email: "cook@cricketmedia.com", phone: "+44 7911 555666", status: "in_progress", lastContacted: "3 days ago", details: "Social Media Strategy Proposal" },
    { id: "l-m5", name: "Chloe Bennett", email: "chloe@webtech.com", phone: "+44 7911 222333", status: "new", lastContacted: "5 days ago", details: "Content Writing Retainer" }
  ]
};

const initialEvents: Record<PersonaType, LiveFeedEvent[]> = {
  loans: [
    { id: "e-l1", leadName: "Anjali Gupta", action: "opened your email 'Q2 Home Loan Lowest Interest Rates'", timeAgo: "2m ago", channel: "email", timestamp: new Date(Date.now() - 2 * 60 * 1000) },
    { id: "e-l2", leadName: "Rohan Malhotra", action: "clicked your WhatsApp link 'Book Callback'", timeAgo: "15m ago", channel: "whatsapp", timestamp: new Date(Date.now() - 15 * 60 * 1000) },
    { id: "e-l3", leadName: "Vikram Rathore", action: "read your WhatsApp message 'Gold Loan Special Offer'", timeAgo: "45m ago", channel: "whatsapp", timestamp: new Date(Date.now() - 45 * 60 * 1000) },
    { id: "e-l4", leadName: "Sneha Nair", action: "opened your email 'Education Loan Pre-Approval'", timeAgo: "2h ago", channel: "email", timestamp: new Date(Date.now() - 120 * 60 * 1000) }
  ],
  retail: [
    { id: "e-r1", leadName: "David Miller", action: "opened your email 'VIP Early Summer Collection Access'", timeAgo: "5m ago", channel: "email", timestamp: new Date(Date.now() - 5 * 60 * 1000) },
    { id: "e-r2", leadName: "Emma Watson", action: "clicked your WhatsApp link 'Redeem Coupon Code'", timeAgo: "12m ago", channel: "whatsapp", timestamp: new Date(Date.now() - 120 * 1000) },
    { id: "e-r3", leadName: "Sophia Martinez", action: "read your WhatsApp message 'Your Cart is Waiting'", timeAgo: "1h ago", channel: "whatsapp", timestamp: new Date(Date.now() - 60 * 60 * 1000) },
    { id: "e-r4", leadName: "Oliver Taylor", action: "opened your email 'Pre-order Confirmation'", timeAgo: "3h ago", channel: "email", timestamp: new Date(Date.now() - 180 * 60 * 1000) }
  ],
  marketing: [
    { id: "e-m1", leadName: "Sarah Jenkins", action: "opened your email 'Free SEO Audit & Review Pitch'", timeAgo: "3m ago", channel: "email", timestamp: new Date(Date.now() - 3 * 60 * 1000) },
    { id: "e-m2", leadName: "Marcus Aurelius", action: "clicked your WhatsApp link 'Schedule PPC Strategy'", timeAgo: "22m ago", channel: "whatsapp", timestamp: new Date(Date.now() - 22 * 60 * 1000) },
    { id: "e-m3", leadName: "Alistair Cook", action: "read your WhatsApp message 'Proposal Update Notification'", timeAgo: "50m ago", channel: "whatsapp", timestamp: new Date(Date.now() - 50 * 60 * 1000) },
    { id: "e-m4", leadName: "Chloe Bennett", action: "opened your email 'Content Writing Retainer Rates'", timeAgo: "4h ago", channel: "email", timestamp: new Date(Date.now() - 240 * 60 * 1000) }
  ]
};

const mockMetrics: Record<PersonaType, DashboardMetric[]> = {
  loans: [
    { label: "My Active Leads", value: 34, change: "+12% vs last week", isPositive: true, tooltip: "Assigned leads currently in pipeline excluding closed/rejected" },
    { label: "Campaigns Sent", value: 24, change: "+4 this month", isPositive: true, tooltip: "Total distinct marketing campaigns dispatched" },
    { label: "Avg. Engagement Rate", value: "78.4%", change: "+5.2% vs last month", isPositive: true, tooltip: "Blended average of email open rates and WhatsApp read rates" },
    { label: "My Conversions", value: 8, change: "+24% conversion rate", isPositive: true, tooltip: "Leads successfully converted to customers" }
  ],
  retail: [
    { label: "My Active Leads", value: 142, change: "+18% vs last week", isPositive: true, tooltip: "Unique customers inquiring about products or programs" },
    { label: "Campaigns Sent", value: 12, change: "+2 this month", isPositive: true, tooltip: "Total customer broadcasts dispatched" },
    { label: "Avg. Engagement Rate", value: "89.1%", change: "+3.1% vs last month", isPositive: true, tooltip: "Blended open rate of catalog emails and WhatsApp discounts" },
    { label: "My Conversions", value: 48, change: "+33.8% sales rate", isPositive: true, tooltip: "Total completed sales / coupon redemptions" }
  ],
  marketing: [
    { label: "My Active Leads", value: 18, change: "+5% vs last week", isPositive: true, tooltip: "Active enterprise accounts pitching or scope negotiation" },
    { label: "Campaigns Sent", value: 38, change: "+8 this month", isPositive: true, tooltip: "Total email pitches and WhatsApp touchpoints sent" },
    { label: "Avg. Engagement Rate", value: "62.5%", change: "-2.1% vs last month", isPositive: false, tooltip: "Blended outreach open and booking link click-through rates" },
    { label: "My Conversions", value: 4, change: "22% proposal win rate", isPositive: true, tooltip: "Retainer or fixed-budget project contracts signed" }
  ]
};

const webhookSimulationPool: Record<PersonaType, Omit<LiveFeedEvent, "id" | "timestamp" | "timeAgo">[]> = {
  loans: [
    { leadName: "Anjali Gupta", action: "clicked your email link 'Check Eligibility Score'", channel: "email" },
    { leadName: "Vikram Rathore", action: "clicked your WhatsApp link 'Send Documents'", channel: "whatsapp" },
    { leadName: "Rohan Malhotra", action: "opened your email 'Business Loan Documents Checklist'", channel: "email" },
    { leadName: "Sneha Nair", action: "read your WhatsApp message 'Your application is under review'", channel: "whatsapp" },
    { leadName: "Vijay Kumar", action: "submitted the inquiry form for Personal Loan on your page", channel: "email" }
  ],
  retail: [
    { leadName: "Emma Watson", action: "opened your email 'VIP Apparel Pre-order catalog'", channel: "email" },
    { leadName: "David Miller", action: "clicked your WhatsApp link 'View Custom Cart'", channel: "whatsapp" },
    { leadName: "Sophia Martinez", action: "clicked your email link 'Manage Loyalty Profile'", channel: "email" },
    { leadName: "Oliver Taylor", action: "read your WhatsApp message 'Special boutique drop today'", channel: "whatsapp" }
  ],
  marketing: [
    { leadName: "Sarah Jenkins", action: "clicked your email link 'View Live Website Audit'", channel: "email" },
    { leadName: "Marcus Aurelius", action: "opened your email 'LeadHub CRM Case Study'", channel: "email" },
    { leadName: "Chloe Bennett", action: "clicked your WhatsApp link 'Accept Scope Agreement'", channel: "whatsapp" },
    { leadName: "Alistair Cook", action: "read your WhatsApp message 'Let's chat about Q3 deliverables'", channel: "whatsapp" }
  ]
};

export function useAgentDashboard(agentId: string, initialPersona: PersonaType = "loans") {
  const [persona, setPersona] = useState<PersonaType>(initialPersona);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [liveFeed, setLiveFeed] = useState<LiveFeedEvent[]>([]);

  // Simulate initial load
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setMetrics(mockMetrics[persona]);
      setCampaigns(mockCampaigns[persona]);
      setLeads(mockLeads[persona]);
      setLiveFeed(initialEvents[persona]);
      setLoading(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [persona]);

  // Method to trigger a webhook simulation event
  const simulateNewWebhookEvent = useCallback(() => {
    const pool = webhookSimulationPool[persona];
    const randomIndex = Math.floor(Math.random() * pool.length);
    const randomEvent = pool[randomIndex];

    const newEvent: LiveFeedEvent = {
      id: `sim-${Date.now()}`,
      leadName: randomEvent.leadName,
      action: randomEvent.action,
      channel: randomEvent.channel,
      timestamp: new Date(),
      timeAgo: "Just now"
    };

    setLiveFeed((prev) => [newEvent, ...prev]);

    // Update corresponding metrics or leads dynamically to simulate interaction
    setMetrics((prev) =>
      prev.map((metric) => {
        if (metric.label === "Avg. Engagement Rate") {
          const val = parseFloat(metric.value as string);
          return {
            ...metric,
            value: `${(val + 0.2).toFixed(1)}%`
          };
        }
        return metric;
      })
    );
  }, [persona]);

  // Auto simulation timer: triggers every 45s to mimic active lead activity
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      simulateNewWebhookEvent();
    }, 45000);

    return () => clearInterval(interval);
  }, [loading, simulateNewWebhookEvent]);

  // Helper to format timestamps relative to current time
  const getRelativeTimeText = (timestamp: Date): string => {
    const diffMs = Date.now() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1m ago";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1h ago";
    if (diffHours < 24) return `${diffHours}h ago`;

    return timestamp.toLocaleDateString();
  };

  // Keep times updated relative to current time
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const formattedLiveFeed = liveFeed.map((event) => ({
    ...event,
    timeAgo: event.timeAgo === "Just now" ? "Just now" : getRelativeTimeText(event.timestamp)
  }));

  return {
    persona,
    setPersona,
    loading,
    metrics,
    campaigns,
    leads,
    liveFeed: formattedLiveFeed,
    simulateNewWebhookEvent
  };
}

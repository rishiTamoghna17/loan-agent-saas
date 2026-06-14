"use client";

import { useEffect, useRef } from "react";
import { trackWhatsAppCampaignClick } from "@/app/dashboard/actions";

export function AgentVisitTracker({ agentId, slug }: { agentId: string; slug: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackAgentEvent(agentId, "website_visit", { slug });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const wacid = params.get("wacid");
      if (wacid) {
        trackWhatsAppCampaignClick(wacid).catch((err) =>
          console.error("Error tracking WhatsApp click:", err)
        );
      }
    }
  }, [agentId, slug]);

  return null;
}

export function TrackableWhatsAppLink({
  agentId,
  href,
  children,
  className,
  metadata
}: {
  agentId: string;
  href: string;
  children: React.ReactNode;
  className?: string;
  metadata?: Record<string, unknown>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() => {
        void trackAgentEvent(agentId, "whatsapp_click", metadata);
      }}
    >
      {children}
    </a>
  );
}

async function trackAgentEvent(agentId: string, eventType: "website_visit" | "whatsapp_click", metadata?: Record<string, unknown>) {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        agent_id: agentId,
        event_type: eventType,
        metadata: metadata || {}
      })
    });
  } catch {
    // Analytics should never block the customer journey.
  }
}

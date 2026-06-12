"use client";

import { MessageCircle } from "lucide-react";
import { normalizePhoneForWhatsApp } from "@/lib/format";

export function ContactLeadButton({
  agentId,
  leadName,
  phone
}: {
  agentId: string;
  leadName: string;
  phone: string;
}) {
  const message = `Hi ${leadName},\nThank you for your enquiry.`;
  const href = `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`;

  return (
    <a
      className="btn-whatsapp"
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        void fetch("/api/analytics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            agent_id: agentId,
            event_type: "whatsapp_click",
            metadata: { lead_name: leadName, phone, location: "dashboard" }
          })
        });
      }}
    >
      <MessageCircle className="h-4 w-4" />
      
    </a>
  );
}

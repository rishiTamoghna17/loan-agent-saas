"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function LinkTracker() {
  const searchParams = useSearchParams();
  const prospectId = searchParams.get("prospect_id");

  useEffect(() => {
    if (prospectId) {
      fetch("/api/track/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prospect_id: prospectId,
          page_url: window.location.href
        }),
        keepalive: true
      }).catch(() => {
        // Tracking must never block the public demo page.
      });
    }
  }, [prospectId]);

  return null;
}

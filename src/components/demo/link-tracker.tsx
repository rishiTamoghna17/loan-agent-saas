"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackWebsiteVisit } from "@/app/demo/actions";

export function LinkTracker() {
  const searchParams = useSearchParams();
  const prospectId = searchParams.get("prospect_id");

  useEffect(() => {
    if (prospectId) {
      const userAgent = window.navigator.userAgent;
      const pageUrl = window.location.href;
      // IP address will be captured on the server side if needed, 
      // but for now we pass a placeholder or let the server handle it
      trackWebsiteVisit(prospectId, pageUrl, userAgent, "client-side-visit");
    }
  }, [prospectId]);

  return null;
}

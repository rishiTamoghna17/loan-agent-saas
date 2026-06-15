"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Globe, Sparkles, X, ArrowRight } from "lucide-react";

export interface WebsiteAlertBannerProps {
  agentProfile: {
    website_slug?: string;
    is_website_published?: boolean;
    slug?: string; // Fallback slug parameter
  };
}

export function WebsiteAlertBanner({ agentProfile }: WebsiteAlertBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Default to true until loaded to prevent flash

  const slug = agentProfile.website_slug || agentProfile.slug || "agent";
  const isPublished = !!agentProfile.is_website_published;

  useEffect(() => {
    // Check if dismissed state exists in localStorage for onboarding card
    if (typeof window !== "undefined" && !isPublished) {
      const dismissed = localStorage.getItem("leadhub-website-banner-dismissed");
      setIsDismissed(dismissed === "true");
    } else {
      setIsDismissed(false); // Never dismiss the active live status badge
    }
  }, [isPublished]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("leadhub-website-banner-dismissed", "true");
    }
  };

  const getWebsiteUrl = () => {
    if (typeof window !== "undefined") {
      const host = window.location.host;
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        const port = window.location.port ? `:${window.location.port}` : "";
        return `http://localhost${port}/agent/${slug}`;
      }
    }
    return `${process.env.NEXT_PUBLIC_APP_HOST}/agent/${slug}`;
  };

  if (isDismissed) return null;

  return (
    <div className="mb-6 animate-in fade-in-50 slide-in-from-top-2 duration-300">
      {isPublished ? (
        /* PUBLISHED STATE: Sleek active status badge */
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-50/10 px-4 py-3.5 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3">
            {/* Status Pulse Indicator */}
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>

            <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-900">Your profile website is live:</span>
              <a
                href={getWebsiteUrl()}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-emerald-700 hover:text-emerald-800 underline decoration-2 decoration-emerald-500/30 hover:decoration-emerald-500 flex items-center gap-1 inline-flex"
              >
                {getWebsiteUrl()}
              </a>
            </p>
          </div>

          <a
            href={getWebsiteUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            Visit Site <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        /* UNPUBLISHED STATE: Clean onboarding alert card */
        <div className="relative rounded-2xl border border-blue-500/10 bg-gradient-to-r from-blue-50/30 to-indigo-50/20 p-5 pr-12 shadow-sm backdrop-blur-md">
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Dismiss onboarding banner"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-950 flex items-center gap-1.5 text-sm sm:text-base">
                  <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                  Your Profile Link is Reserved!
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-2xl">
                  Your professional profile link is reserved at <span className="font-bold text-slate-800">{getWebsiteUrl()}</span>. When you&apos;re ready to build your web presence, visit the &apos;Website Builder&apos; tab below.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2.5">
              <Link
                href="/dashboard/website"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 shadow-md shadow-blue-600/10 transition-all hover:scale-105 active:scale-95"
              >
                Build Site <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

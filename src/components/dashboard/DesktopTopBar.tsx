"use client";

import { Bell, UserRound, Search, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type DesktopTopBarProps = {
  title: string;
  subtitle?: string;
  agentSlug?: string;
};

export function DesktopTopBar({ 
  title, 
  subtitle,
  agentSlug
}: DesktopTopBarProps) {
  return (
    <header className="hidden lg:flex lg:h-16 lg:items-center lg:justify-between lg:border-b lg:border-slate-200 lg:bg-white lg:px-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search placeholder */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <input 
            placeholder="Search..." 
            className="h-10 w-80 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {agentSlug && (
          <Link href={`/agent/${agentSlug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="flex h-10 items-center gap-1.5 border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm text-sm">
              <Globe2 className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
              <span>View public page</span>
            </Button>
          </Link>
        )}
        
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 rounded-lg hover:bg-slate-50"
        >
          <Bell className="h-5 w-5 text-slate-600" strokeWidth={1.75} />
        </Button>
        
        {/* Avatar (placeholder) */}
        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
          <UserRound className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </header>
  );
}
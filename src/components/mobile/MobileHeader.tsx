"use client";


import Link from "next/link";
import { Menu, Bell, User } from "lucide-react";
import { LeadHubMark } from "@/components/brand/lead-hub-mark";
import { Button } from "@/components/ui/button";

type MobileHeaderProps = {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  menuButtonRef: React.RefObject<HTMLButtonElement>;
};

export function MobileHeader({ isMenuOpen, setIsMenuOpen, menuButtonRef }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4">
      <div className="flex h-14 items-center justify-between gap-3">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation-drawer"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <div className="relative h-5 w-5">
            <span
              className={`absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 bg-slate-700 transition-all duration-300 ease-in-out ${
                isMenuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-[30%] -translate-y-1/2"
              }`}
            />
            <span
              className={`absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 bg-slate-700 transition-all duration-300 ease-in-out ${
                isMenuOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
              }`}
            />
            <span
              className={`absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 bg-slate-700 transition-all duration-300 ease-in-out ${
                isMenuOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-[70%] -translate-y-1/2"
              }`}
            />
          </div>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <LeadHubMark className="h-7 w-7" />
          <span className="text-base font-bold text-slate-900">LeadHub</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
            <Bell className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
            <User className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </header>
  );
}

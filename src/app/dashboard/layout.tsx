"use client";

import { useState, useRef, Suspense } from "react";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { MobileNavigationDrawer } from "@/components/mobile/MobileNavigationDrawer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="min-h-screen">
      {/* Mobile header - only on mobile */}
      <div className="lg:hidden">
        <MobileHeader
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          menuButtonRef={menuButtonRef}
        />
        <Suspense fallback={null}>
          <MobileNavigationDrawer
            isOpen={isMenuOpen}
            setIsOpen={setIsMenuOpen}
            menuButtonRef={menuButtonRef}
          />
        </Suspense>
      </div>

      {children}
    </div>
  );
}
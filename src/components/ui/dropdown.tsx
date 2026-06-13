"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  position = "bottom-right",
  className
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const positionClasses = {
    "bottom-left": "top-full left-0 mt-2",
    "bottom-right": "top-full right-0 mt-2",
    "top-left": "bottom-full left-0 mb-2",
    "top-right": "bottom-full right-0 mb-2"
  };

  return (
    <div className={clsx("relative inline-block", className)} ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={clsx(
            "absolute z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl",
            positionClasses[position]
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function DropdownItem({
  children,
  onClick,
  className,
  disabled = false
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-slate-100 hover:text-slate-900",
        className
      )}
    >
      {children}
    </button>
  );
}

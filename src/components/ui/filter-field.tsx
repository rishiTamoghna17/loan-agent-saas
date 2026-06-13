"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterField({ label, children, className }: FilterFieldProps) {
  const id = React.useId();
  
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label 
        htmlFor={id} 
        className="text-xs font-medium text-slate-700"
      >
        {label}
      </label>
      <div id={id}>{children}</div>
    </div>
  );
}

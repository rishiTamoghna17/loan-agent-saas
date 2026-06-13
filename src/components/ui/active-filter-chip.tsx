"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ActiveFilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

export function ActiveFilterChip({ label, value, onRemove, className }: ActiveFilterChipProps) {
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700",
        className
      )}
    >
      <span className="font-medium">{label}: </span>
      <span>{value}</span>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-5 w-5 p-0 text-slate-400 hover:text-slate-900"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

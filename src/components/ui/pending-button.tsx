"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type PendingButtonProps = {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
};

export function PendingButton({ children, pendingText = "Saving...", className = "btn-primary", disabled = false }: PendingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingText : children}
    </button>
  );
}

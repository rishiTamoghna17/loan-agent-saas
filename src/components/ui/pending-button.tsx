"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "./button";

type PendingButtonProps = ButtonProps & {
  pendingText?: string;
};

export function PendingButton({
  children,
  pendingText = "Saving...",
  disabled = false,
  ...props
}: PendingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      {...props}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingText : children}
    </Button>
  );
}

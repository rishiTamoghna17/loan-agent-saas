"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "./button";

type PendingButtonProps = ButtonProps & {
  pendingText?: string;
};

export const PendingButton = forwardRef<HTMLButtonElement, PendingButtonProps>(
  ({ children, pendingText = "Saving...", disabled = false, ...props }, ref) => {
    const { pending } = useFormStatus();

    return (
      <Button
        ref={ref}
        type="submit"
        disabled={pending || disabled}
        {...props}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? pendingText : children}
      </Button>
    );
  }
);

PendingButton.displayName = "PendingButton";

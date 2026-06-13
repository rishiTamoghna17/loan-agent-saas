"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DropdownMenu = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <div className="relative inline-block overflow-visible">
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, {
              open,
              setOpen,
            })
          : child
      )}
    </div>
  );
};

const DropdownMenuTrigger = ({
  children,
  open,
  setOpen,
  asChild = false,
  className,
  ...props
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  asChild?: boolean;
  className?: string;
} & (React.ButtonHTMLAttributes<HTMLButtonElement> | React.HTMLAttributes<HTMLDivElement>)) => {
  const Comp = asChild ? "div" : "button";
  return (
    <Comp
      onClick={() => setOpen?.(!open)}
      className={cn("", className)}
      {...(props as any)}
    >
      {children}
    </Comp>
  );
};

const DropdownMenuContent = ({
  children,
  open,
  setOpen,
  className,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  className?: string;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen?.(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-[100] min-w-[8rem] overflow-visible rounded-md border bg-white p-1 text-slate-950 shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
};

const DropdownMenuItem = ({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
};

const DropdownMenuSeparator = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-slate-100", className)}
    />
  );
};

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};

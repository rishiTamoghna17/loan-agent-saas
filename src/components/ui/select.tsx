"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// Create context!
interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  onClose?: () => void;
}
const SelectContext = React.createContext<SelectContextValue | null>(null);

interface SelectProps {
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Select({
  name,
  value,
  onValueChange,
  defaultValue,
  placeholder = "Select an option",
  children,
  className,
  disabled,
}: SelectProps) {
  const [internalValue, setInternalValue] = React.useState<string>(() => {
    return value ?? defaultValue ?? "";
  });
  const [open, setOpen] = React.useState(false);

  const currentValue = value ?? internalValue;

  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalValue(newValue);
    }
    setOpen(false);
  };

  const childrenArray = React.Children.toArray(children);
  const selectedLabel = childrenArray.find(
    (child) => React.isValidElement(child) && (child.props as any).value === currentValue
  )
    ? (childrenArray.find(
        (child) => React.isValidElement(child) && (child.props as any).value === currentValue
      ) as React.ReactElement).props.children
    : placeholder;

  return (
    <div className={cn("relative", className)}>
      <input type="hidden" name={name} value={currentValue} />
      <SelectContext.Provider
        value={{
          value: currentValue,
          onValueChange: handleValueChange,
          onClose: () => setOpen(false),
        }}
      >
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between px-3"
              disabled={disabled}
            >
              <span className="truncate">{selectedLabel}</span>
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
            {children}
          </DropdownMenuContent>
        </DropdownMenu>
      </SelectContext.Provider>
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export function SelectItem({ value, children }: SelectItemProps) {
  const context = React.useContext(SelectContext);

  const handleClick = () => {
    context?.onValueChange?.(value);
  };

  return (
    <DropdownMenuItem
      onClick={handleClick}
      className={cn(
        "flex items-center justify-between gap-2",
        context?.value === value ? "bg-slate-100" : ""
      )}
    >
      <span>{children}</span>
      {context?.value === value && <Check className="h-4 w-4" />}
    </DropdownMenuItem>
  );
}

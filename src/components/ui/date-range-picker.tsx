"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar, ChevronDown, X, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
  className?: string;
}

export function DateRangePicker({ from, to, onFromChange, onToChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<{ from?: Date; to?: Date }>(() => {
    return {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
  });

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setSelected(range);
      onFromChange(range.from ? format(range.from, "yyyy-MM-dd") : "");
      if (range.to) {
        onToChange(format(range.to, "yyyy-MM-dd"));
      }
    }
  };

  const handleClear = () => {
    setSelected({});
    onFromChange("");
    onToChange("");
    setOpen(false);
  };

  const displayText = React.useMemo(() => {
    if (selected.from && selected.to) {
      return `${format(selected.from, "MMM d, yyyy")} - ${format(selected.to, "MMM d, yyyy")}`;
    }
    if (selected.from) {
      return `${format(selected.from, "MMM d, yyyy")} - ...`;
    }
    return "Select date range";
  }, [selected]);

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-left font-normal"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className={cn(!selected.from && !selected.to && "text-slate-500")}>
                {displayText}
              </span>
            </div>
            {selected.from || selected.to ? (
              <X
                className="h-4 w-4 text-slate-400 hover:text-slate-900"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              />
            ) : (
              <ChevronDown className="h-4 w-4 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[320px] w-auto p-0 z-[90] max-h-[min(420px,calc(100vh-32px))] overflow-auto" align="start">
          <DayPicker
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            initialFocus
            components={{
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
            }}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";

type MobileBulkActionBarProps = {
  selectedCount: number;
  onMove: () => void;
  onCancel: () => void;
};

export function MobileBulkActionBar({
  selectedCount,
  onMove,
  onCancel
}: MobileBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-900">
          {selectedCount} selected
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onMove}
          >
            Move
          </Button>
        </div>
      </div>
    </div>
  );
}

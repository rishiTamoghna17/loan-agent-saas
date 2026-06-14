"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type MobileStatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  color: "blue" | "emerald" | "amber" | "green" | "purple";
  fullWidth?: boolean;
  progress?: number;
};

export function MobileStatCard({
  label,
  value,
  icon: Icon,
  color,
  fullWidth = false,
  progress
}: MobileStatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600"
  };

  return (
    <Card className={fullWidth ? "col-span-2" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{value}{progress ? "%" : ""}</p>
          </div>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </div>
        {progress !== undefined ? (
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

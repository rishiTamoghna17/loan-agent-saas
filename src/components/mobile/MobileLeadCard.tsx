"use client";

import { MoreHorizontal, MessageCircle, Settings2, Folder } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContactLeadButton } from "@/components/dashboard/contact-lead-button";
import { LeadActionsPanel } from "@/components/dashboard/lead-actions-panel";
import { LeadStatusSelect } from "@/components/dashboard/lead-status-select";
import { STATUS_LABELS } from "@/lib/constants";
import type { LeadStatus } from "@/lib/database.types";

type Note = { id: string; note: string; created_at?: string };
type FollowUp = { id: string; due_at: string; note: string | null; status: string; completion_source?: string | null };

type MobileLeadCardProps = {
  lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    status: LeadStatus;
    folder_id: string | null;
    folderName?: string | null;
    lead_notes: Note[];
    lead_follow_ups: FollowUp[];
    archived_at?: string | null;
    deleted_at?: string | null;
  };
  agentId: string;
  timezone: string;
  isSelected: boolean;
  onSelect: (leadId: string) => void;
  isTrialExpired: boolean;
  emailHistory?: any[];
  whatsappHistory?: any[];
};

function getStatusVariant(status: string) {
  switch (status) {
    case "new":
      return "default";
    case "contacted":
      return "primary";
    case "follow_up":
      return "warning";
    case "closed":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "default";
  }
}

export function MobileLeadCard({
  lead,
  agentId,
  timezone,
  isSelected,
  onSelect,
  isTrialExpired,
  emailHistory = [],
  whatsappHistory = []
}: MobileLeadCardProps) {
  const lifecycle = lead.deleted_at ? "deleted" : lead.archived_at ? "archived" : "active";
  return (
    <Card className="shadow-none border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            name="lead_ids"
            value={lead.id}
            form="move-leads-form"
            aria-label={`Select ${lead.name}`}
            disabled={isTrialExpired}
            checked={isSelected}
            onChange={() => onSelect(lead.id)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
                {lead.email ? (
                  <p className="text-xs text-slate-500 truncate">{lead.email}</p>
                ) : (
                  <p className="text-xs text-slate-500">{lead.phone}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg shrink-0"
              >
                <MoreHorizontal className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Badge variant={getStatusVariant(lead.status)}>{STATUS_LABELS[lead.status]}</Badge>
              {lead.folderName ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                  <Folder className="h-3 w-3" strokeWidth={1.75} />
                  {lead.folderName}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex gap-2">
              <ContactLeadButton
                agentId={agentId}
                leadName={lead.name}
                phone={lead.phone}
              />
              <LeadActionsPanel
                leadId={lead.id}
                agentId={agentId}
                leadName={lead.name}
                timezone={timezone}
                notes={lead.lead_notes ?? []}
                followUps={lead.lead_follow_ups ?? []}
                disabled={isTrialExpired}
                lifecycle={lifecycle}
                emailHistory={emailHistory}
                whatsappHistory={whatsappHistory}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

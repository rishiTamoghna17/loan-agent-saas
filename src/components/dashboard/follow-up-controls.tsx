"use client";

import { useState } from "react";
import { CalendarClock, Check, Pencil, X } from "lucide-react";
import { saveFollowUp, updateFollowUpStatus } from "@/app/dashboard/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { formatFollowUpDate } from "@/lib/follow-ups";

type FollowUp = { id: string; due_at: string; note: string | null; status: string; completion_source?: string | null };

export function FollowUpControls({
  leadId,
  timezone,
  followUps,
  disabled
}: {
  leadId: string;
  timezone: string;
  followUps: FollowUp[];
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const pending = followUps.find((item) => item.status === "pending");
  const latestCompleted = followUps
    .filter((item) => item.status === "completed")
    .sort((a, b) => (b.due_at ?? "").localeCompare(a.due_at ?? ""))[0];

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
      {pending ? (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1 text-xs font-semibold text-ink"><CalendarClock className="h-3.5 w-3.5" />{formatFollowUpDate(pending.due_at, timezone)}</p>
              {pending.note ? <p className="mt-1 text-xs text-slate-500">{pending.note}</p> : null}
            </div>
            <button type="button" onClick={() => setEditing((value) => !value)} disabled={disabled} title="Reschedule follow-up" className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-50">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <form action={updateFollowUpStatus}>
              <input type="hidden" name="id" value={pending.id} />
              <input type="hidden" name="status" value="completed" />
              <PendingButton className="btn-secondary px-2 py-1 text-xs" pendingText="Saving..." disabled={disabled}><Check className="h-3.5 w-3.5" />Complete</PendingButton>
            </form>
            <form action={updateFollowUpStatus}>
              <input type="hidden" name="id" value={pending.id} />
              <input type="hidden" name="status" value="cancelled" />
              <PendingButton className="btn-secondary px-2 py-1 text-xs" pendingText="Saving..." disabled={disabled}><X className="h-3.5 w-3.5" />Cancel</PendingButton>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {latestCompleted ? (
            <p className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              {latestCompleted.completion_source === "reminder_email" ? "Reminder sent · Completed" : "Completed"}
            </p>
          ) : null}
          <button type="button" onClick={() => setEditing((value) => !value)} disabled={disabled} className="flex items-center gap-1 text-xs font-semibold text-brand-blue disabled:opacity-50">
            <CalendarClock className="h-3.5 w-3.5" />Schedule follow-up
          </button>
        </div>
      )}

      {editing ? (
        <form action={saveFollowUp} className="mt-2 space-y-2">
          {pending ? <input type="hidden" name="id" value={pending.id} /> : null}
          <input type="hidden" name="lead_id" value={leadId} />
          <input type="hidden" name="timezone" value={timezone} />
          <input name="due_at" type="datetime-local" required className="field text-xs" disabled={disabled} />
          <input name="note" placeholder="Follow-up note" defaultValue={pending?.note ?? ""} className="field text-xs" disabled={disabled} />
          <PendingButton className="btn-primary px-2 py-1 text-xs" pendingText="Scheduling..." disabled={disabled}>Save follow-up</PendingButton>
        </form>
      ) : null}
    </div>
  );
}

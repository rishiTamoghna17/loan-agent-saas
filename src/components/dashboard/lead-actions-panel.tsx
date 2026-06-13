"use client";

import { useState } from "react";
import { Archive, CalendarClock, FileText, RotateCcw, Settings2, Trash2, X } from "lucide-react";
import { addLeadNote, archiveLead, deleteLead, restoreLead } from "@/app/dashboard/actions";
import { FollowUpControls } from "@/components/dashboard/follow-up-controls";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

type Note = { id: string; note: string; created_at?: string };
type FollowUp = { id: string; due_at: string; note: string | null; status: string; completion_source?: string | null };

export function LeadActionsPanel({
  leadId,
  agentId,
  leadName,
  timezone,
  notes,
  followUps,
  disabled,
  lifecycle = "active"
}: {
  leadId: string;
  agentId: string;
  leadName: string;
  timezone: string;
  notes: Note[];
  followUps: FollowUp[];
  disabled: boolean;
  lifecycle?: "active" | "archived" | "deleted";
}) {
  const [open, setOpen] = useState(false);
  const pending = followUps.find((item) => item.status === "pending");

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="whitespace-nowrap">
        <Settings2 className="h-4 w-4" />
        Manage
      </Button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Manage ${leadName}`}
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Manage lead</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{leadName}</h3>
              </div>
              <Button variant="outline" size="icon" onClick={() => setOpen(false)} aria-label="Close lead manager" title="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <section className="mt-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CalendarClock className="h-4 w-4 text-blue-600" />Follow-up</h4>
              <div className="mt-2">
                <FollowUpControls leadId={leadId} timezone={timezone} followUps={followUps} disabled={disabled} />
              </div>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText className="h-4 w-4 text-blue-600" />Notes</h4>
              <form action={addLeadNote} className="mt-3 flex gap-2">
                <input type="hidden" name="lead_id" value={leadId} />
                <input type="hidden" name="agent_id" value={agentId} />
                <input name="note" className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1" placeholder="Add a note" disabled={disabled} />
                <PendingButton className="shrink-0" pendingText="Adding..." disabled={disabled}>Add</PendingButton>
              </form>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {notes.length ? notes.map((note) => (
                  <div key={note.id} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                    <p>{note.note}</p>
                    {note.created_at ? <p className="mt-1 text-xs text-slate-400">{formatDate(note.created_at)}</p> : null}
                  </div>
                )) : <p className="text-sm text-slate-500">No notes added yet.</p>}
              </div>
            </section>

            <section className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-500">{pending ? "A follow-up is currently scheduled." : "No pending follow-up."}</p>
              <div className="flex flex-wrap gap-2">
                {lifecycle === "active" ? <>
                  <form action={archiveLead}><input type="hidden" name="lead_id" value={leadId} /><PendingButton variant="outline" pendingText="Archiving..." disabled={disabled}><Archive className="h-4 w-4" />Archive</PendingButton></form>
                  <form action={deleteLead}><input type="hidden" name="lead_id" value={leadId} /><PendingButton variant="outline" className="text-red-600" pendingText="Deleting..." disabled={disabled}><Trash2 className="h-4 w-4" />Delete</PendingButton></form>
                </> : <form action={restoreLead}><input type="hidden" name="lead_id" value={leadId} /><PendingButton variant="outline" pendingText="Restoring..." disabled={disabled}><RotateCcw className="h-4 w-4" />Restore lead</PendingButton></form>}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}

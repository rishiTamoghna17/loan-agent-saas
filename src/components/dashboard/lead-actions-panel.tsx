"use client";

import { useState } from "react";
import { Archive, CalendarClock, FileText, RotateCcw, Settings2, Trash2, X } from "lucide-react";
import { addLeadNote, archiveLead, deleteLead, restoreLead } from "@/app/dashboard/actions";
import { FollowUpControls } from "@/components/dashboard/follow-up-controls";
import { PendingButton } from "@/components/ui/pending-button";
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
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary whitespace-nowrap">
        <Settings2 className="h-4 w-4" />
        Manage
      </button>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Manage lead</p>
                <h3 className="mt-1 text-xl font-bold text-ink">{leadName}</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close lead manager" title="Close" className="rounded-md border border-slate-200 p-2 text-slate-500 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </div>

            <section className="mt-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-ink"><CalendarClock className="h-4 w-4 text-brand-blue" />Follow-up</h4>
              <div className="mt-2">
                <FollowUpControls leadId={leadId} timezone={timezone} followUps={followUps} disabled={disabled} />
              </div>
            </section>

            <section className="mt-5 border-t border-slate-100 pt-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-ink"><FileText className="h-4 w-4 text-brand-blue" />Notes</h4>
              <form action={addLeadNote} className="mt-3 flex gap-2">
                <input type="hidden" name="lead_id" value={leadId} />
                <input type="hidden" name="agent_id" value={agentId} />
                <input name="note" className="field" placeholder="Add a note" disabled={disabled} />
                <PendingButton className="btn-secondary shrink-0" pendingText="Adding..." disabled={disabled}>Add</PendingButton>
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
                  <form action={archiveLead}><input type="hidden" name="lead_id" value={leadId} /><PendingButton className="btn-secondary" pendingText="Archiving..." disabled={disabled}><Archive className="h-4 w-4" />Archive</PendingButton></form>
                  <form action={deleteLead}><input type="hidden" name="lead_id" value={leadId} /><PendingButton className="btn-secondary text-red-600" pendingText="Deleting..." disabled={disabled}><Trash2 className="h-4 w-4" />Delete</PendingButton></form>
                </> : <form action={restoreLead}><input type="hidden" name="lead_id" value={leadId} /><PendingButton className="btn-secondary" pendingText="Restoring..." disabled={disabled}><RotateCcw className="h-4 w-4" />Restore lead</PendingButton></form>}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}

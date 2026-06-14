"use client";

import { useState } from "react";
import { Archive, CalendarClock, FileText, RotateCcw, Settings2, Trash2, X, Mail, MessageSquare } from "lucide-react";
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
  lifecycle = "active",
  emailHistory = [],
  whatsappHistory = [],
  phone,
  email,
  loanType,
  requiredAmount,
  status,
  folderName,
  openOverride,
  onCloseOverride
}: {
  leadId: string;
  agentId: string;
  leadName: string;
  timezone: string;
  notes: Note[];
  followUps: FollowUp[];
  disabled: boolean;
  lifecycle?: "active" | "archived" | "deleted";
  emailHistory?: any[];
  whatsappHistory?: any[];
  phone?: string | null;
  email?: string | null;
  loanType?: string | null;
  requiredAmount?: number | string | null;
  status?: string | null;
  folderName?: string | null;
  openOverride?: boolean;
  onCloseOverride?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pending = followUps.find((item) => item.status === "pending");

  const isDialogOpen = openOverride !== undefined ? openOverride : open;
  const closeDialog = () => {
    if (onCloseOverride) {
      onCloseOverride();
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      {openOverride === undefined && (
        <Button variant="outline" onClick={() => setOpen(true)} className="whitespace-nowrap">
          <Settings2 className="h-4 w-4" />
          Manage
        </Button>
      )}
      {isDialogOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Manage ${leadName}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Lead Details</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{leadName}</h3>
              </div>
              <Button variant="outline" size="icon" onClick={closeDialog} aria-label="Close lead manager" title="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Lead Details Banner */}
            {(phone || email || loanType || requiredAmount || status || folderName) && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  {phone && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                      <a href={`tel:${phone}`} className="text-blue-600 hover:underline font-semibold block mt-0.5">
                        {phone}
                      </a>
                    </div>
                  )}
                  {email && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</span>
                      <a href={`mailto:${email}`} className="text-blue-600 hover:underline font-semibold block mt-0.5 truncate" title={email}>
                        {email}
                      </a>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  {loanType && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loan Product</span>
                      <span className="text-slate-800 font-medium block mt-0.5">{loanType}</span>
                    </div>
                  )}
                  {requiredAmount && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Amount</span>
                      <span className="text-slate-800 font-medium block mt-0.5">
                        {typeof requiredAmount === 'number' 
                          ? requiredAmount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
                          : Number(requiredAmount).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  {status && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 mt-1">
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  {folderName && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Folder</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 mt-1">
                        {folderName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

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

            <section className="mt-5 border-t border-slate-100 pt-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Mail className="h-4 w-4 text-blue-600" />
                Campaign History
              </h4>
              <div className="mt-3 max-h-60 overflow-y-auto pr-1">
                {(!emailHistory || emailHistory.length === 0) && (!whatsappHistory || whatsappHistory.length === 0) ? (
                  <p className="text-sm text-slate-500">No campaigns sent to this lead.</p>
                ) : (
                  <div className="relative pl-4 border-l border-slate-200 space-y-6 mt-2 ml-2">
                    {(() => {
                      const combinedHistory: any[] = [];

                      // Add email campaigns activities
                      emailHistory.forEach((email: any) => {
                        combinedHistory.push({
                          id: `${email.id}-sent`,
                          channel: 'email',
                          type: 'sent',
                          title: `Sent Email "${email.template_name || email.campaign_name || "Campaign"}"`,
                          date: email.email_sent_at || email.created_at,
                          color: "bg-blue-500"
                        });
                        if (email.email_delivered_at || email.status === 'delivered') {
                          combinedHistory.push({
                            id: `${email.id}-delivered`,
                            channel: 'email',
                            type: 'delivered',
                            title: 'Email Delivered',
                            date: email.email_delivered_at || email.updated_at,
                            color: "bg-emerald-500"
                          });
                        }
                        if (email.email_opened_at || email.opened_at) {
                          combinedHistory.push({
                            id: `${email.id}-opened`,
                            channel: 'email',
                            type: 'opened',
                            title: 'Opened Email',
                            date: email.email_opened_at || email.opened_at,
                            color: "bg-teal-500"
                          });
                        }
                        if (email.email_clicked_at || email.clicked_at) {
                          combinedHistory.push({
                            id: `${email.id}-clicked`,
                            channel: 'email',
                            type: 'clicked',
                            title: 'Clicked Email Link',
                            date: email.email_clicked_at || email.clicked_at,
                            color: "bg-purple-500"
                          });
                        }
                        if (email.replied_at) {
                          combinedHistory.push({
                            id: `${email.id}-replied`,
                            channel: 'email',
                            type: 'replied',
                            title: 'Replied to Email',
                            date: email.replied_at,
                            color: "bg-cyan-500"
                          });
                        }
                        if (email.status === 'failed') {
                          combinedHistory.push({
                            id: `${email.id}-failed`,
                            channel: 'email',
                            type: 'failed',
                            title: 'Failed to Send Email',
                            date: email.updated_at || email.created_at,
                            color: "bg-red-500"
                          });
                        }
                      });

                      // Add WhatsApp campaigns activities
                      whatsappHistory.forEach((wa: any) => {
                        combinedHistory.push({
                          id: `${wa.id}-sent`,
                          channel: 'whatsapp',
                          type: 'sent',
                          title: `Sent WhatsApp "${wa.template_name || wa.campaign_name || "Campaign"}"`,
                          date: wa.sent_at || wa.created_at,
                          color: "bg-blue-500"
                        });
                        if (wa.delivered_at || wa.status === 'delivered') {
                          combinedHistory.push({
                            id: `${wa.id}-delivered`,
                            channel: 'whatsapp',
                            type: 'delivered',
                            title: 'WhatsApp Delivered',
                            date: wa.delivered_at || wa.updated_at,
                            color: "bg-emerald-500"
                          });
                        }
                        if (wa.clicked_at || wa.status === 'clicked') {
                          combinedHistory.push({
                            id: `${wa.id}-clicked`,
                            channel: 'whatsapp',
                            type: 'clicked',
                            title: 'Clicked WhatsApp Link',
                            date: wa.clicked_at || wa.updated_at,
                            color: "bg-purple-500"
                          });
                        }
                        if (wa.status === 'failed') {
                          combinedHistory.push({
                            id: `${wa.id}-failed`,
                            channel: 'whatsapp',
                            type: 'failed',
                            title: 'Failed to Send WhatsApp',
                            date: wa.updated_at || wa.created_at,
                            color: "bg-red-500"
                          });
                        }
                      });

                      // Sort descending by date
                      combinedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      return combinedHistory.map((activity) => (
                        <div key={activity.id} className="relative pl-6">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full ${activity.color} ring-4 ring-white`} />
                          <div className="flex items-start gap-2">
                            {activity.channel === 'email' ? (
                              <Mail className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{formatDate(activity.date)}</p>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
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

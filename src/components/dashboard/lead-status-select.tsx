"use client";

import { useRef, useTransition } from "react";
import { updateLeadStatus } from "@/app/dashboard/actions";
import { LEAD_STATUSES, STATUS_LABELS } from "@/lib/constants";
import type { LeadStatus } from "@/lib/database.types";

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={updateLeadStatus} className="flex flex-col gap-1">
      <input type="hidden" name="lead_id" value={leadId} />
      <select
        name="status"
        defaultValue={status}
        className="field min-w-24"
        disabled={isPending}
        onChange={() => {
          startTransition(() => {
            formRef.current?.requestSubmit();
          });
        }}
      >
        {LEAD_STATUSES.map((leadStatus) => (
          <option key={leadStatus} value={leadStatus}>{STATUS_LABELS[leadStatus]}</option>
        ))}
      </select>
      {isPending ? <span className="text-xs text-slate-500">Saving...</span> : null}
    </form>
  );
}

"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { sendCampaignEmail } from "@/app/admin/actions";

const TEMPLATES = [
  { id: "intro", name: "Introduction", subject: "Boost your loan business with LeadHub" },
  { id: "demo", name: "Demo Invitation", subject: "See LeadHub in action - Interactive Demo" },
  { id: "trial", name: "Trial Reminder", subject: "Last chance to start your free trial" },
  { id: "followup", name: "Follow-up", subject: "Following up on your interest in LeadHub" },
];

export function CampaignSender({ selectedProspects }: { selectedProspects: string[] }) {
  const [isSending, setIsSending] = useState(false);
  const [template, setTemplate] = useState(TEMPLATES[0].id);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSend = async () => {
    if (selectedProspects.length === 0) return;
    
    setIsSending(true);
    setResult(null);
    
    try {
      const response = await sendCampaignEmail(selectedProspects, template);
      setResult(response);
    } catch (error) {
      setResult({ success: false, error: "Failed to send campaign" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Send Campaign</h2>
      <p className="mb-6 text-sm text-slate-500">
        Sending to <span className="font-bold text-ink">{selectedProspects.length}</span> selected prospects.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Choose Template</label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`flex flex-col rounded-lg border p-4 text-left transition-all ${
                  template === t.id 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className={`text-sm font-bold ${template === t.id ? "text-primary" : "text-ink"}`}>
                  {t.name}
                </span>
                <span className="mt-1 text-xs text-slate-500">{t.subject}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={isSending || selectedProspects.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {isSending ? "Sending..." : `Send ${TEMPLATES.find(t => t.id === template)?.name} Email`}
        </button>

        {result && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.success ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Campaign sent successfully!
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                {result.error}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Mail, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, Save } from "lucide-react";
import { sendCampaignEmail, saveCampaignTemplate, deleteCampaignTemplate } from "@/app/admin/actions";
import { useRouter } from "next/navigation";

const DEFAULT_TEMPLATES = [
  { id: "intro", name: "Introduction", subject: "Boost your loan business with LeadHub" },
  { id: "demo", name: "Demo Invitation", subject: "See LeadHub in action - Interactive Demo" },
  { id: "trial", name: "Trial Reminder", subject: "Last chance to start your free trial" },
  { id: "followup", name: "Follow-up", subject: "Following up on your interest in LeadHub" },
];

export function CampaignSender({ 
  selectedProspects,
  customTemplates = []
}: { 
  selectedProspects: string[];
  customTemplates?: any[];
}) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATES[0].id);
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
  
  // Clear result when selection changes
  useEffect(() => {
    setResult(null);
  }, [selectedProspects]);
  
  // Builder state
  const [isBuilding, setIsBuilding] = useState(false);
  const [builderData, setBuilderData] = useState({ name: "", subject: "", content: "" });
  const [isSaving, setIsSaving] = useState(false);

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];
  const selectedTemplate = allTemplates.find(t => t.id === templateId) || DEFAULT_TEMPLATES[0];

  const handleSend = async () => {
    if (selectedProspects.length === 0) return;
    
    setIsSending(true);
    setResult(null);
    
    try {
      const response = await sendCampaignEmail(selectedProspects, templateId);
      setResult(response);
    } catch (error) {
      setResult({ success: false, error: "Failed to send campaign" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!builderData.name || !builderData.subject || !builderData.content) return;
    
    setIsSaving(true);
    try {
      await saveCampaignTemplate(builderData);
      setIsBuilding(false);
      setBuilderData({ name: "", subject: "", content: "" });
      router.refresh();
    } catch (error) {
      console.error("Failed to save template", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      await deleteCampaignTemplate(id);
      if (templateId === id) setTemplateId(DEFAULT_TEMPLATES[0].id);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete template", error);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Send Campaign</h2>
        <button
          onClick={() => setIsBuilding(!isBuilding)}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
        >
          {isBuilding ? "Cancel" : <><Plus className="h-3 w-3" /> Create Template</>}
        </button>
      </div>

      {isBuilding ? (
        <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <h3 className="text-sm font-bold text-brand-blue">Custom Template Builder</h3>
          <div>
            <label className="text-xs font-medium text-slate-600">Template Name</label>
            <input
              type="text"
              value={builderData.name}
              onChange={(e) => setBuilderData({ ...builderData, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              placeholder="e.g., Summer Special"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Email Subject</label>
            <input
              type="text"
              value={builderData.subject}
              onChange={(e) => setBuilderData({ ...builderData, subject: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              placeholder="Subject line..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Email Content</label>
              <span className="text-[10px] text-slate-400">Use {"{{name}}"} for personalization</span>
            </div>
            <textarea
              value={builderData.content}
              onChange={(e) => setBuilderData({ ...builderData, content: e.target.value })}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              placeholder="Hi {{name}}, we have a special offer for you..."
            />
          </div>
          <button
            onClick={handleSaveTemplate}
            disabled={isSaving || !builderData.name || !builderData.subject || !builderData.content}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue py-2 text-sm font-bold text-white transition-colors hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Sending to <span className="font-bold text-ink">{selectedProspects.length}</span> selected prospects.
          </p>

          <div>
            <label className="text-sm font-medium text-slate-700">Choose Template</label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {allTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`group relative flex flex-col rounded-lg border p-4 text-left transition-all ${
                    templateId === t.id 
                      ? "border-brand-blue bg-blue-50 ring-1 ring-brand-blue" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`text-sm font-bold ${templateId === t.id ? "text-brand-blue" : "text-ink"}`}>
                    {t.name}
                  </span>
                  <span className="mt-1 text-[10px] text-slate-500 line-clamp-1">{t.subject}</span>
                  
                  {t.id !== "intro" && t.id !== "demo" && t.id !== "trial" && t.id !== "followup" && (
                    <button
                      onClick={(e) => handleDeleteTemplate(t.id, e)}
                      className="absolute right-2 top-2 hidden rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 group-hover:block"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={isSending || selectedProspects.length === 0}
            className="btn-primary w-full py-3"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {isSending ? "Sending..." : `Send ${selectedTemplate.name} Email`}
          </button>

          {result && (
            <div className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {result.count === 1 
                    ? "Campaign sent successfully to 1 prospect!" 
                    : `Campaign sent successfully to ${result.count} prospects!`}
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
      )}
    </div>
  );
}

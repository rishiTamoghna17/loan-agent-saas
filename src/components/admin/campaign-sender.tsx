"use client";

import { useState, useEffect } from "react";
import { Mail, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, Save, Paperclip, Upload, X, Edit2 } from "lucide-react";
import { sendCampaignEmail, saveCampaignTemplate, deleteCampaignTemplate } from "@/app/admin/actions";
import { useRouter } from "next/navigation";
import {
  CAMPAIGN_VARIABLES,
  createPreviewCampaignContext,
  renderCampaignTemplate
} from "@/lib/campaign-templates";

interface BuilderState {
  name: string;
  subject: string;
  content: string;
  brochure_attached: boolean;
  pdf_urls: string[];
  pdfFiles: File[];
  id?: string;
  show_header: boolean;
}

// Helper to extract filename from URL
const getFilenameFromUrl = (url: string) => {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/");
    return parts[parts.length - 1] || "document.pdf";
  } catch {
    return "document.pdf";
  }
};

export function CampaignSender({ 
  selectedProspects,
  customTemplates = []
}: { 
  selectedProspects: string[];
  customTemplates?: any[];
}) {
  const router = useRouter();
  
  const allTemplates = customTemplates;
  const hasNoTemplates = allTemplates.length === 0;
  
  const [isSending, setIsSending] = useState(false);
  const [templateId, setTemplateId] = useState<string | undefined>(allTemplates[0]?.id);
  const [result, setResult] = useState<{ success: boolean; count?: number; failedCount?: number; error?: string } | null>(null);
  
  // Clear result when selection changes
  useEffect(() => {
    setResult(null);
  }, [selectedProspects]);
  
  // Builder state
  const [isBuilding, setIsBuilding] = useState(hasNoTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [builderData, setBuilderData] = useState<BuilderState>({ 
    name: "", 
    subject: "", 
    content: "", 
    brochure_attached: false, 
    pdf_urls: [], 
    pdfFiles: [],
    show_header: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showHeader, setShowHeader] = useState<boolean | undefined>(undefined);

  // Update showHeader when template changes to use the template's default
  useEffect(() => {
    const selected = allTemplates.find(t => t.id === templateId);
    setShowHeader(selected?.show_header);
  }, [templateId, allTemplates]);

  const selectedTemplate = allTemplates.find(t => t.id === templateId) || allTemplates[0] || null;
  const renderedPreview = selectedTemplate ? renderCampaignTemplate({
    ...selectedTemplate,
    show_header: showHeader !== undefined ? showHeader : selectedTemplate.show_header ?? true
  }, createPreviewCampaignContext()) : null;

  const handleSend = async () => {
    if (selectedProspects.length === 0 || !templateId) return;
    
    setIsSending(true);
    setResult(null);
    
    try {
      const response = await sendCampaignEmail(selectedProspects, templateId, showHeader);
      setResult(response);
    } catch (error) {
      setResult({ success: false, error: "Failed to send campaign" });
    } finally {
      setIsSending(false);
    }
  };

  const startEdit = (template: any) => {
    // Always edit existing database template
    setEditingId(template.id);
    setBuilderData({
      name: template.name,
      subject: template.subject,
      content: template.content,
      brochure_attached: template.brochure_attached || false,
      pdf_urls: template.pdf_urls || [],
      pdfFiles: [],
      id: template.id,
      show_header: template.show_header ?? true
    });
    setIsBuilding(true);
  };

  const cancelEdit = () => {
    setIsBuilding(false);
    setEditingId(null);
    setBuilderData({ 
      name: "", 
      subject: "", 
      content: "", 
      brochure_attached: false, 
      pdf_urls: [], 
      pdfFiles: [],
      show_header: true
    });
  };

  const handleSaveTemplate = async () => {
    if (!builderData.name || !builderData.subject || !builderData.content) return;
    
    setIsSaving(true);
    try {
      let finalPdfUrls = [...builderData.pdf_urls];
      
      // Upload new files
      if (builderData.pdfFiles.length > 0) {
        for (const file of builderData.pdfFiles) {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/upload-pdf', {
            method: 'POST',
            body: formData
          });
          if (!response.ok) {
            throw new Error('Failed to upload PDF: ' + file.name);
          }
          const result = await response.json();
          finalPdfUrls.push(result.url);
        }
      }

      await saveCampaignTemplate({
        id: builderData.id,
        name: builderData.name,
        subject: builderData.subject,
        content: builderData.content,
        brochure_attached: builderData.brochure_attached,
        pdf_urls: finalPdfUrls,
        show_header: builderData.show_header
      });
      
      cancelEdit();
      router.refresh();
    } catch (error) {
      console.error("Failed to save template", error);
      alert("Failed to save template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      await deleteCampaignTemplate(id);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete template", error);
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== "application/pdf") {
          alert(`File "${file.name}" is not a PDF.`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds 10MB.`);
          continue;
        }
        newFiles.push(file);
      }
      setBuilderData(prev => ({ ...prev, pdfFiles: [...prev.pdfFiles, ...newFiles] }));
    }
  };

  const removePdfFile = (index: number) => {
    setBuilderData(prev => ({
      ...prev,
      pdfFiles: prev.pdfFiles.filter((_, i) => i !== index)
    }));
  };

  const removePdfUrl = (index: number) => {
    setBuilderData(prev => ({
      ...prev,
      pdf_urls: prev.pdf_urls.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Send Campaign</h2>
        <button
          onClick={isBuilding ? cancelEdit : () => { setIsBuilding(true); setEditingId(null); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
        >
          {isBuilding ? "Cancel" : <><Plus className="h-3 w-3" /> Create Template</>}
        </button>
      </div>

      {isBuilding ? (
        <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <h3 className="text-sm font-bold text-brand-blue">
            {editingId ? "Edit Template" : "Custom Template Builder"}
          </h3>
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
              <span className="text-[10px] text-slate-400">Use variables below for personalization</span>
            </div>
            <textarea
              value={builderData.content}
              onChange={(e) => setBuilderData({ ...builderData, content: e.target.value })}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
              placeholder="Hi {{name}}, we have a special offer for you..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="brochure-toggle-builder"
              checked={builderData.brochure_attached}
              onChange={(e) => setBuilderData({ ...builderData, brochure_attached: e.target.checked })}
              className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            <label htmlFor="brochure-toggle-builder" className="text-xs font-medium text-slate-700">
              Brochure Attached
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="header-toggle-builder"
              checked={builderData.show_header}
              onChange={(e) => setBuilderData({ ...builderData, show_header: e.target.checked })}
              className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            <label htmlFor="header-toggle-builder" className="text-xs font-medium text-slate-700">
              Show Header
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">PDF Attachments (optional)</label>
            <div className="space-y-2 mb-2">
              {builderData.pdf_urls.map((url, index) => (
                <div key={`url-${index}`} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md">
                  <Paperclip className="h-4 w-4 text-brand-blue" />
                  <span className="text-xs text-slate-700 flex-1 truncate">
                    {getFilenameFromUrl(url)}
                  </span>
                  <button
                    onClick={() => removePdfUrl(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {builderData.pdfFiles.map((file, index) => (
                <div key={`file-${index}`} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md">
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-700 flex-1 truncate">{file.name}</span>
                  <button
                    onClick={() => removePdfFile(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <Upload className="h-6 w-6 mb-1 text-slate-400" />
                <p className="text-[10px] text-slate-500"><span className="font-semibold">Add PDF</span> or drag and drop</p>
                <p className="text-[9px] text-slate-400">PDF only (max 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                multiple
                onChange={handlePdfFileChange}
              />
            </label>
          </div>

          <button
            onClick={handleSaveTemplate}
            disabled={isSaving || !builderData.name || !builderData.subject || !builderData.content}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue py-2 text-sm font-bold text-white transition-colors hover:bg-brand-blue/90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Template
          </button>
          
          <div className="rounded-md bg-white p-3 text-[11px] text-slate-500">
            <p className="mb-2 font-semibold text-slate-700">Available variables</p>
            <div className="flex flex-wrap gap-1.5">
              {CAMPAIGN_VARIABLES.map((variable) => (
                <code key={variable} className="rounded bg-slate-100 px-1.5 py-1 text-slate-600">
                  {variable}
                </code>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Sending to <span className="font-bold text-ink">{selectedProspects.length}</span> selected prospects.
          </p>

          {hasNoTemplates ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
              <h3 className="text-lg font-semibold text-amber-800">No Templates Found</h3>
              <p className="mt-2 text-sm text-amber-700">
                Create your first email template to start sending campaigns!
              </p>
              <button
                onClick={() => setIsBuilding(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
              >
                <Plus className="h-4 w-4" />
                Create First Template
              </button>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-700">Choose Template</label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {allTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`group relative flex flex-col rounded-lg border p-4 text-left transition-all cursor-pointer ${
                      templateId === t.id 
                        ? "border-brand-blue bg-blue-50 ring-1 ring-brand-blue" 
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className={`text-sm font-bold ${templateId === t.id ? "text-brand-blue" : "text-ink"}`}>
                      {t.name}
                    </span>
                    <span className="mt-1 text-[10px] text-slate-500 line-clamp-1">{t.subject}</span>
                    {"description" in t && t.description ? (
                      <span className="mt-2 text-[10px] leading-4 text-slate-400 line-clamp-2">{t.description}</span>
                    ) : null}
                    
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(t); }}
                        className="p-1 text-slate-400 hover:text-brand-blue"
                        title="Edit template"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTemplate(t.id, e)}
                        className="p-1 text-slate-400 hover:text-red-500"
                        title="Delete template"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasNoTemplates && templateId && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                  <p className="mt-1 text-sm font-bold text-ink">{renderedPreview.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(selectedTemplate.brochure_attached || false) && (
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                      <Paperclip className="h-3 w-3" />
                      {selectedTemplate.pdf_urls?.length && selectedTemplate.pdf_urls.length > 0
                        ? `${selectedTemplate.pdf_urls.length} document(s)` 
                        : "Brochure attached"}
                    </div>
                  )}
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-md border border-slate-300 bg-white hover:bg-slate-100"
                  >
                    Full Preview
                  </button>
                </div>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="brochure-toggle-preview"
                  checked={selectedTemplate.brochure_attached || false}
                  onChange={async (e) => {
                      try {
                        await saveCampaignTemplate({
                          id: selectedTemplate.id,
                          name: selectedTemplate.name,
                          subject: selectedTemplate.subject,
                          content: selectedTemplate.content,
                          brochure_attached: e.target.checked,
                          pdf_urls: selectedTemplate.pdf_urls,
                          show_header: selectedTemplate.show_header ?? true
                        });
                        router.refresh();
                      } catch (error) {
                        console.error("Failed to update brochure toggle", error);
                      }
                    }}
                  className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                <label htmlFor="brochure-toggle-preview" className="text-xs font-medium text-slate-700">
                  Brochure Attached
                </label>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="header-toggle-preview"
                  checked={showHeader !== undefined ? showHeader : selectedTemplate.show_header ?? true}
                  onChange={(e) => setShowHeader(e.target.checked)}
                  className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                <label htmlFor="header-toggle-preview" className="text-xs font-medium text-slate-700">
                  Show Header
                </label>
              </div>

              {/* Show attached document names */}
              {selectedTemplate.pdf_urls?.length > 0 && (
                <div className="mb-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-600">Attached Documents:</p>
                  {selectedTemplate.pdf_urls.map((url: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate">{getFilenameFromUrl(url)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Render small preview */}
              <div
                className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white p-2"
                dangerouslySetInnerHTML={{ __html: renderedPreview.htmlContent }}
              />
            </div>
          )}

          {/* Full Preview Modal */}
          {showPreviewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">Email Preview</h3>
                    <p className="text-sm text-slate-500">{renderedPreview.subject}</p>
                  </div>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 bg-slate-50">
                  <div
                    className="p-4"
                    dangerouslySetInnerHTML={{ __html: renderedPreview.htmlContent }}
                  />
                </div>
                <div className="p-4 border-t border-slate-200 flex justify-between items-center">
                  {(selectedTemplate.brochure_attached || false) && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Paperclip className="h-4 w-4" />
                      {selectedTemplate.pdf_urls?.length && selectedTemplate.pdf_urls.length > 0
                        ? `${selectedTemplate.pdf_urls.length} document(s) attached` 
                        : "Brochure attached"}
                    </div>
                  )}
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-brand-blue rounded-md hover:bg-brand-blue/90"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-brand-blue">Available variables</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CAMPAIGN_VARIABLES.map((variable) => (
                <code key={variable} className="rounded bg-white px-1.5 py-1 text-slate-600">
                  {variable}
                </code>
              ))}
            </div>
          </div>

          {!hasNoTemplates && templateId && (
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
          )}

          {result && (
            <div className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {result.count === 1 
                    ? `Campaign sent successfully to 1 prospect${result.failedCount ? `, ${result.failedCount} failed` : ""}.` 
                    : `Campaign sent successfully to ${result.count} prospects${result.failedCount ? `, ${result.failedCount} failed` : ""}.`}
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

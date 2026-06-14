"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  Eye, 
  Send, 
  Paperclip, 
  Loader2, 
  X, 
  ChevronRight,
  Info,
  CheckCircle,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  saveAgentCampaignTemplate, 
  deleteAgentCampaignTemplate,
  sendAgentCampaignEmail,
  sendAgentWhatsAppCampaign
} from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";

type Template = {
  id: string;
  name: string;
  subject: string;
  content: string;
  brochure_attached: boolean;
  pdf_urls: string[] | null;
  show_header: boolean;
  header_content?: string | null;
  header_bg_color?: string | null;
  header_text_color?: string | null;
  footer_content?: string | null;
  footer_bg_color?: string | null;
  footer_text_color?: string | null;
  channel?: 'email' | 'whatsapp' | null;
};

type AgentCampaignSenderProps = {
  agent: any;
  selectedLeadIds: string[];
  templates: Template[];
  activeChannel?: 'email' | 'whatsapp';
  isTrialExpired: boolean;
  onSendSuccess: () => void;
};

export function AgentCampaignSender({
  agent,
  selectedLeadIds,
  templates,
  activeChannel = 'email',
  isTrialExpired,
  onSendSuccess
}: AgentCampaignSenderProps) {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Template Form State
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [brochureAttached, setBrochureAttached] = useState(false);
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);
  const [showHeader, setShowHeader] = useState(true);
  const [templateChannel, setTemplateChannel] = useState<'email' | 'whatsapp'>('email');
  
  // Custom Branding Form State
  const [headerContent, setHeaderContent] = useState("");
  const [headerBgColor, setHeaderBgColor] = useState("#0f63ff");
  const [headerTextColor, setHeaderTextColor] = useState("#ffffff");
  const [footerContent, setFooterContent] = useState("");
  const [footerBgColor, setFooterBgColor] = useState("#f8fafc");
  const [footerTextColor, setFooterTextColor] = useState("#64748b");

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);

  // Send campaign state
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ success: boolean; message: string } | null>(null);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleCreateTemplate = () => {
    setTemplateId("");
    setTemplateName("");
    setSubject("");
    setContent("");
    setBrochureAttached(false);
    setPdfUrls([]);
    setShowHeader(true);
    setHeaderContent("");
    setHeaderBgColor("#0f63ff");
    setHeaderTextColor("#ffffff");
    setFooterContent("");
    setFooterBgColor("#f8fafc");
    setFooterTextColor("#64748b");
    setTemplateChannel(activeChannel);
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setTemplateId(template.id);
    setTemplateName(template.name);
    setSubject(template.subject);
    setContent(template.content);
    setBrochureAttached(template.brochure_attached);
    setPdfUrls(template.pdf_urls || []);
    setShowHeader(template.show_header);
    setHeaderContent(template.header_content || "");
    setHeaderBgColor(template.header_bg_color || "#0f63ff");
    setHeaderTextColor(template.header_text_color || "#ffffff");
    setFooterContent(template.footer_content || "");
    setFooterBgColor(template.footer_bg_color || "#f8fafc");
    setFooterTextColor(template.footer_text_color || "#64748b");
    setTemplateChannel(template.channel === "whatsapp" ? "whatsapp" : "email");
    setIsTemplateModalOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    startTransition(async () => {
      const res = await deleteAgentCampaignTemplate(id);
      if (res.success) {
        if (selectedTemplateId === id) setSelectedTemplateId("");
        router.refresh();
      }
    });
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !content.trim()) return;
    if (templateChannel === 'email' && !subject.trim()) return;
    startTransition(async () => {
      const res = await saveAgentCampaignTemplate({
        id: templateId || undefined,
        name: templateName,
        subject: templateChannel === 'email' ? subject : 'WhatsApp Message',
        content,
        brochure_attached: templateChannel === 'email' ? brochureAttached : false,
        pdf_urls: templateChannel === 'email' ? pdfUrls : [],
        show_header: templateChannel === 'email' ? showHeader : false,
        header_content: templateChannel === 'email' ? headerContent : null,
        header_bg_color: templateChannel === 'email' ? headerBgColor : null,
        header_text_color: templateChannel === 'email' ? headerTextColor : null,
        footer_content: templateChannel === 'email' ? footerContent : null,
        footer_bg_color: templateChannel === 'email' ? footerBgColor : null,
        footer_text_color: templateChannel === 'email' ? footerTextColor : null,
        channel: templateChannel
      });
      if (res.success) {
        setIsTemplateModalOpen(false);
        if (res.data?.id) setSelectedTemplateId(res.data.id);
        router.refresh();
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("File format not supported. Please upload PDF, Word, Excel, CSV, text, or images.");
      return;
    }

    try {
      setIsUploading(true);
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        body: data
      });
      const result = await res.json();

      if (result.url) {
        setPdfUrls(prev => [...prev, result.url]);
      } else {
        alert(result.error || "Upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplateId || selectedLeadIds.length === 0) return;
    try {
      setIsSending(true);
      setSendStatus(null);
      
      if (selectedTemplate?.channel === 'whatsapp') {
        const res = await sendAgentWhatsAppCampaign(selectedLeadIds, selectedTemplateId);
        if (res.success) {
          setSendStatus({
            success: true,
            message: `WhatsApp campaign sent successfully to ${res.count} leads!`
          });
          onSendSuccess();
          router.refresh();
        } else {
          setSendStatus({
            success: false,
            message: res.error || "Failed to send WhatsApp campaign."
          });
        }
      } else {
        const res = await sendAgentCampaignEmail(selectedLeadIds, selectedTemplateId, showHeader);
        if (res.success) {
          setSendStatus({
            success: true,
            message: `Email campaign sent successfully to ${res.count} leads!`
          });
          onSendSuccess();
          router.refresh();
        } else {
          setSendStatus({
            success: false,
            message: res.error || "Failed to send campaign emails."
          });
        }
      }
    } catch (err: any) {
      setSendStatus({
        success: false,
        message: err.message || "An unexpected error occurred."
      });
    } finally {
      setIsSending(false);
    }
  };

  // Compile Simulated Preview
  const previewData = useMemo(() => {
    if (!selectedTemplate) return { subject: "", content: "" };

    const demoUrl = `${window.location.origin}/agent/${agent.slug || ""}`;
    const signupUrl = demoUrl;
    const ctx = {
      name: "Rahul Sharma",
      loan_type: "Home Loan",
      required_amount: "₹25,00,000",
      city: "Mumbai",
      demo_url: demoUrl,
      signup_url: signupUrl,
      sender_name: agent.agent_name || agent.name || "Agent",
      sender_phone: agent.phone || "",
      sender_email: agent.email || ""
    };

    const replacePlaceholders = (text: string) => {
      if (!text) return "";
      return text
        .replace(/\{\{prospect_name\}\}/g, ctx.name)
        .replace(/\{\{loan_type\}\}/g, ctx.loan_type)
        .replace(/\{\{required_amount\}\}/g, ctx.required_amount)
        .replace(/\{\{city\}\}/g, ctx.city)
        .replace(/\{\{demo_url\}\}/g, ctx.demo_url)
        .replace(/\{\{signup_url\}\}/g, ctx.signup_url)
        .replace(/\{\{sender_name\}\}/g, ctx.sender_name)
        .replace(/\{\{sender_phone\}\}/g, ctx.sender_phone)
        .replace(/\{\{sender_email\}\}/g, ctx.sender_email);
    };

    return {
      subject: replacePlaceholders(selectedTemplate.subject),
      content: replacePlaceholders(selectedTemplate.content)
    };
  }, [selectedTemplate, agent]);

  const insertVariable = (variable: string) => {
    setContent(prev => prev + ` {{${variable}}}`);
  };

  const variablesList = [
    { label: "Prospect Name", val: "prospect_name" },
    { label: "Loan Type", val: "loan_type" },
    { label: "Required Amount", val: "required_amount" },
    { label: "Prospect City", val: "city" },
    { label: "Demo Url", val: "demo_url" },
    { label: "Signup Url", val: "signup_url" },
    { label: "Sender Name", val: "sender_name" },
    { label: "Sender Phone", val: "sender_phone" },
    { label: "Sender Email", val: "sender_email" }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900">Configure Campaign</h3>
        <p className="text-xs text-slate-500 mt-0.5">Select a template and preview your campaign</p>
      </div>

      {/* Select Template grid */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-600">Choose Template</label>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
          {templates.map(t => (
            <div 
              key={t.id}
              onClick={() => setSelectedTemplateId(t.id)}
              className={`p-3 border rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                selectedTemplateId === t.id 
                  ? "border-blue-600 bg-blue-50/50" 
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{t.subject}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTemplate(t);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-[10px] font-medium px-1">Edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTemplate(t.id);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={handleCreateTemplate}
          variant="outline"
          className="w-full flex items-center justify-center gap-1.5 h-10 border-dashed rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Create New Template
        </Button>
      </div>

      {/* Sending Stats Indicator */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Campaign Recipients</p>
          <p className="text-xs text-slate-600 mt-0.5">
            You have selected <span className="font-bold text-blue-600">{selectedLeadIds.length}</span> lead(s) as recipients.
          </p>
        </div>
      </div>

      {/* Buttons controls */}
      <div className="flex gap-2">
        <Button
          onClick={() => setIsPreviewModalOpen(true)}
          variant="outline"
          className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl"
          disabled={!selectedTemplateId}
        >
          <Eye className="h-4 w-4" />
          {selectedTemplate?.channel === 'whatsapp' ? 'Preview Message' : 'Preview Email'}
        </Button>
        <Button
          onClick={handleSendCampaign}
          disabled={isSending || isTrialExpired || !selectedTemplateId || selectedLeadIds.length === 0}
          className={`flex-1 font-medium h-11 rounded-xl text-white transition-all ${
            selectedTemplate?.channel === 'whatsapp'
              ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-100'
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-100'
          } shadow-sm`}
        >
          {isSending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Sending...</>
          ) : (
            <><Send className="h-4 w-4 mr-1.5" /> Send Campaign</>
          )}
        </Button>
      </div>

      {sendStatus && (
        <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
          sendStatus.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {sendStatus.success ? (
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{sendStatus.message}</span>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                {templateId ? "Edit Campaign Template" : "Create Campaign Template"}
              </h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-500 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input fields */}
              <div className="lg:col-span-8 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Template Name</label>
                  <input
                    placeholder="e.g. Follow-up reminder"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Template Channel</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="template_channel"
                        value="email"
                        checked={templateChannel === 'email'}
                        onChange={() => setTemplateChannel('email')}
                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      Email Template
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="template_channel"
                        value="whatsapp"
                        checked={templateChannel === 'whatsapp'}
                        onChange={() => setTemplateChannel('whatsapp')}
                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      WhatsApp Template
                    </label>
                  </div>
                </div>

                {templateChannel === 'email' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Line</label>
                    <input
                      placeholder="e.g. Update regarding your Loan Inquiry {{prospect_name}}"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      {templateChannel === 'email' ? "Email HTML Content" : "WhatsApp Text Content"}
                    </label>
                  </div>
                  <textarea
                    placeholder={
                      templateChannel === 'email' 
                        ? "Write your email body here. You can use variables like {{prospect_name}} and {{demo_url}}."
                        : "Write your WhatsApp message here. You can use variables like {{prospect_name}} and {{demo_url}}."
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full min-h-[260px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {templateChannel === 'email' && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showHeader}
                        onChange={(e) => setShowHeader(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      Include branded header & footer
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={brochureAttached}
                        onChange={(e) => setBrochureAttached(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      Attach files / brochures
                    </label>
                  </div>
                )}

                {templateChannel === 'email' && showHeader && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                    <p className="text-xs font-bold text-slate-900">Header & Footer Branding</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Header Title</label>
                        <input
                          placeholder="e.g. LeadHub"
                          value={headerContent}
                          onChange={(e) => setHeaderContent(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Header Background</label>
                          <input
                            type="color"
                            value={headerBgColor}
                            onChange={(e) => setHeaderBgColor(e.target.value)}
                            className="h-9 w-full rounded-md border border-slate-200 bg-white p-1 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Header Text Color</label>
                          <input
                            type="color"
                            value={headerTextColor}
                            onChange={(e) => setHeaderTextColor(e.target.value)}
                            className="h-9 w-full rounded-md border border-slate-200 bg-white p-1 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Footer Text</label>
                        <input
                          placeholder="e.g. Sent by LeadHub Team"
                          value={footerContent}
                          onChange={(e) => setFooterContent(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Footer Background</label>
                          <input
                            type="color"
                            value={footerBgColor}
                            onChange={(e) => setFooterBgColor(e.target.value)}
                            className="h-9 w-full rounded-md border border-slate-200 bg-white p-1 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Footer Text Color</label>
                          <input
                            type="color"
                            value={footerTextColor}
                            onChange={(e) => setFooterTextColor(e.target.value)}
                            className="h-9 w-full rounded-md border border-slate-200 bg-white p-1 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {templateChannel === 'email' && brochureAttached && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">Attachments</p>
                      <label className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        Upload Attachment
                        <input
                          type="file"
                          accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png,.webp"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      {pdfUrls.map((url, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 border rounded-lg text-xs">
                          <span className="truncate max-w-[200px]">{url.split('/').pop()}</span>
                          <button
                            onClick={() => setPdfUrls(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {isUploading && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Uploading attachment...
                        </div>
                      )}
                      {pdfUrls.length === 0 && !isUploading && (
                        <p className="text-xs text-slate-400">No attachments added yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Variables Sidebar */}
              <div className="lg:col-span-4 border-l border-slate-100 lg:pl-6 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Variables Panel</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Click any variable below to insert it at the end of the content field</p>
                </div>

                <div className="space-y-1.5">
                  {variablesList.map(v => (
                    <button
                      key={v.val}
                      onClick={() => insertVariable(v.val)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:border-blue-600 hover:bg-blue-50/20 text-left transition-all"
                    >
                      <span>{v.label}</span>
                      <span className="text-slate-400 text-[10px] font-mono">{`{{${v.val}}}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2 bg-slate-50">
              <Button
                variant="outline"
                onClick={() => setIsTemplateModalOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={pending || !templateName.trim() || (templateChannel === 'email' && !subject.trim()) || !content.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {pending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving...</>
                ) : (
                  "Save Template"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Simulated Modal */}
      {isPreviewModalOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedTemplate.channel === 'whatsapp' ? 'WhatsApp Message Preview' : 'Email Campaign Preview'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Simulated rendering for lead: Rahul Sharma</p>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-500 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 flex flex-col items-center justify-center">
              {selectedTemplate.channel === 'whatsapp' ? (
                /* WhatsApp Message Mockup */
                <div className="w-full max-w-sm bg-[#efeae2] border border-slate-200 rounded-3xl overflow-hidden shadow-lg flex flex-col h-[420px]">
                  {/* Mock WhatsApp Header */}
                  <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3 shrink-0">
                    <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[#075e54]">
                      R
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Rahul Sharma</p>
                      <p className="text-[10px] opacity-80">online</p>
                    </div>
                  </div>
                  {/* Chat Area */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-2 flex flex-col justify-start">
                    <div className="bg-[#dcf8c6] text-slate-950 p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-xs self-start leading-relaxed whitespace-pre-wrap font-sans">
                      {previewData.content}
                    </div>
                  </div>
                </div>
              ) : (
                /* Email Preview */
                <div className="w-full space-y-4">
                  {/* Header Info */}
                  <div className="border rounded-xl p-4 bg-white text-sm space-y-1.5 shadow-sm">
                    <div>
                      <span className="font-semibold text-slate-500">Subject:</span>{" "}
                      <span className="font-bold text-slate-900">{previewData.subject}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Sender:</span>{" "}
                      <span className="text-slate-800">{agent.business_name || agent.agent_name || "Agent"} &lt;{agent.email}&gt;</span>
                    </div>
                    {selectedTemplate.brochure_attached && selectedTemplate.pdf_urls && selectedTemplate.pdf_urls.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-500">Attachments:</span>{" "}
                        <div className="inline-flex flex-wrap gap-1.5 mt-1">
                          {selectedTemplate.pdf_urls.map((url, idx) => (
                            <span key={idx} className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              {url.split('/').pop()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rendered Body */}
                  <div className="bg-[#f4f8fb] p-6 rounded-xl border border-slate-200 max-w-2xl mx-auto shadow-inner">
                    <div className="bg-white border border-[#dbe6f0] rounded-2xl overflow-hidden shadow-sm">
                      {(selectedTemplate.show_header ?? true) && (
                        <div 
                          style={{ 
                            backgroundColor: selectedTemplate.header_bg_color || "#0f63ff", 
                            color: selectedTemplate.header_text_color || "#ffffff" 
                          }} 
                          className="px-6 py-5"
                        >
                          <div className="text-xl font-extrabold tracking-tight">
                            {selectedTemplate.header_content || "LeadHub"}
                          </div>
                          {(selectedTemplate.header_content || "LeadHub") === "LeadHub" && (
                            <div className="mt-1 text-xs opacity-90">
                              Loan Website • Lead CRM • Follow-up Tracking
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-6">
                        <div 
                          className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap font-sans"
                          dangerouslySetInnerHTML={{ __html: previewData.content }}
                        />

                        {!selectedTemplate.footer_content && (
                          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                            LeadHub helps loan agents look professional online and manage every enquiry from one dashboard.
                          </div>
                        )}
                      </div>

                      {selectedTemplate.footer_content && (
                        <div 
                          style={{ 
                            backgroundColor: selectedTemplate.footer_bg_color || "#f8fafc", 
                            color: selectedTemplate.footer_text_color || "#64748b" 
                          }} 
                          className="px-6 py-4 border-t border-slate-100 text-center text-xs"
                        >
                          {selectedTemplate.footer_content}
                        </div>
                      )}
                    </div>

                    {!selectedTemplate.footer_content && (
                      <p className="mt-3 text-center text-[10px] text-slate-400">
                        Sent by LeadHub. You received this because your business contact is publicly available or you previously connected with us.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end bg-slate-50">
              <Button
                variant="outline"
                onClick={() => setIsPreviewModalOpen(false)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

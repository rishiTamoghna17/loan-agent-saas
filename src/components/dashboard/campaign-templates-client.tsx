"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  Eye, 
  Paperclip, 
  Loader2, 
  X, 
  Search,
  Mail,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  saveAgentCampaignTemplate, 
  deleteAgentCampaignTemplate 
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
  agent_id?: string | null;
};

type CampaignTemplatesClientProps = {
  agent: any;
  initialTemplates: Template[];
  isTrialExpired: boolean;
};

export function CampaignTemplatesClient({
  agent,
  initialTemplates,
  isTrialExpired
}: CampaignTemplatesClientProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp">("email");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [pending, startTransition] = useTransition();

  // Template Form State
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [brochureAttached, setBrochureAttached] = useState(false);
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);
  const [showHeader, setShowHeader] = useState(true);
  
  // Custom Branding Form State
  const [headerContent, setHeaderContent] = useState("");
  const [headerBgColor, setHeaderBgColor] = useState("#0f63ff");
  const [headerTextColor, setHeaderTextColor] = useState("#ffffff");
  const [footerContent, setFooterContent] = useState("");
  const [footerBgColor, setFooterBgColor] = useState("#f8fafc");
  const [footerTextColor, setFooterTextColor] = useState("#64748b");

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const channelMatch = activeTab === "whatsapp" 
        ? t.channel === "whatsapp" 
        : (t.channel === "email" || !t.channel);
        
      const searchMatch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.content.toLowerCase().includes(searchQuery.toLowerCase());
                          
      return channelMatch && searchMatch;
    });
  }, [templates, activeTab, searchQuery]);

  const handleCreateTemplate = () => {
    setTemplateId("");
    setTemplateName("");
    setSubject("");
    setContent("");
    setBrochureAttached(false);
    setPdfUrls([]);
    setShowHeader(true);
    setHeaderContent(agent.business_name || agent.name || "LeadHub");
    setHeaderBgColor("#0f63ff");
    setHeaderTextColor("#ffffff");
    setFooterContent(`© ${new Date().getFullYear()} ${agent.business_name || agent.name}. All rights reserved.`);
    setFooterBgColor("#f8fafc");
    setFooterTextColor("#64748b");
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
    setHeaderContent(template.header_content || agent.business_name || agent.name || "LeadHub");
    setHeaderBgColor(template.header_bg_color || "#0f63ff");
    setHeaderTextColor(template.header_text_color || "#ffffff");
    setFooterContent(template.footer_content || `© ${new Date().getFullYear()} ${agent.business_name || agent.name}. All rights reserved.`);
    setFooterBgColor(template.footer_bg_color || "#f8fafc");
    setFooterTextColor(template.footer_text_color || "#64748b");
    setIsTemplateModalOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    startTransition(async () => {
      const res = await deleteAgentCampaignTemplate(id);
      if (res.success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        router.refresh();
      }
    });
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !content.trim()) return;
    if (activeTab === 'email' && !subject.trim()) return;
    
    startTransition(async () => {
      const res = await saveAgentCampaignTemplate({
        id: templateId || undefined,
        name: templateName,
        subject: activeTab === 'email' ? subject : 'WhatsApp Message',
        content,
        brochure_attached: activeTab === 'email' ? brochureAttached : false,
        pdf_urls: activeTab === 'email' ? pdfUrls : [],
        show_header: activeTab === 'email' ? showHeader : false,
        header_content: activeTab === 'email' ? headerContent : null,
        header_bg_color: activeTab === 'email' ? headerBgColor : null,
        header_text_color: activeTab === 'email' ? headerTextColor : null,
        footer_content: activeTab === 'email' ? footerContent : null,
        footer_bg_color: activeTab === 'email' ? footerBgColor : null,
        footer_text_color: activeTab === 'email' ? footerTextColor : null,
        channel: activeTab
      });

      if (res.success && res.data) {
        const savedTemplate = {
          id: res.data.id,
          name: res.data.name,
          subject: res.data.subject,
          content: res.data.content,
          brochure_attached: res.data.brochure_attached,
          pdf_urls: res.data.pdf_urls,
          show_header: res.data.show_header,
          header_content: res.data.header_content,
          header_bg_color: res.data.header_bg_color,
          header_text_color: res.data.header_text_color,
          footer_content: res.data.footer_content,
          footer_bg_color: res.data.footer_bg_color,
          footer_text_color: res.data.footer_text_color,
          channel: res.data.channel as any
        };

        setTemplates(prev => {
          const exists = prev.some(t => t.id === savedTemplate.id);
          if (exists) {
            return prev.map(t => t.id === savedTemplate.id ? savedTemplate : t);
          } else {
            return [...prev, savedTemplate];
          }
        });
        setIsTemplateModalOpen(false);
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

  const handlePreviewTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsPreviewModalOpen(true);
  };

  // Compile Simulated Preview Content
  const previewData = useMemo(() => {
    if (!selectedTemplate) return { subject: "", content: "" };

    const demoUrl = typeof window !== "undefined" ? `${window.location.origin}/agent/${agent.slug || ""}` : `/agent/${agent.slug || ""}`;
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
    <div className="space-y-6">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Email & WhatsApp Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Manage reusable message layouts for marketing campaigns.</p>
        </div>
        <Button
          onClick={handleCreateTemplate}
          disabled={isTrialExpired}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-xl shadow-sm hover:shadow-blue-100 flex items-center gap-2 px-5 self-start"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Channel Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-sm max-w-sm w-full">
          <button
            onClick={() => { setActiveTab("email"); setSearchQuery(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "email"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Mail className="h-4 w-4" />
            Email Templates
          </button>
          <button
            onClick={() => { setActiveTab("whatsapp"); setSearchQuery(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "whatsapp"
                ? "bg-slate-900 text-white shadow"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp Templates
          </button>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'email' ? 'email' : 'WhatsApp'} templates...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10.5 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Templates Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map(t => {
          const isBuiltIn = !t.agent_id;
          return (
            <Card key={t.id} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:border-slate-300 transition-all flex flex-col justify-between group">
              <CardContent className="p-6 space-y-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 truncate" title={t.name}>{t.name}</h3>
                      {isBuiltIn && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200">Built-in</span>
                      )}
                    </div>
                    {activeTab === 'email' && (
                      <p className="text-xs text-slate-500 truncate mt-1">Subject: {t.subject}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-4 leading-relaxed font-sans bg-slate-50 p-3 rounded-xl min-h-[90px]">
                  {t.content}
                </p>
              </CardContent>

              <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePreviewTemplate(t)}
                  className="text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 rounded-lg text-xs"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                
                <div className="flex items-center gap-1">
                  {!isBuiltIn && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditTemplate(t)}
                        disabled={isTrialExpired}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 flex items-center gap-1 px-2.5 rounded-lg text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(t.id)}
                        disabled={isTrialExpired}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50/50 p-2 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">No templates found</p>
              <p className="text-xs text-slate-500 mt-0.5">Create your first custom message layout to get started.</p>
            </div>
            <Button
              onClick={handleCreateTemplate}
              disabled={isTrialExpired}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs"
            >
              Create Template
            </Button>
          </div>
        )}
      </div>

      {/* Create / Edit Template Modal */}
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
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {activeTab === 'email' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Line</label>
                    <input
                      placeholder="e.g. Update regarding your Loan Inquiry {{prospect_name}}"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {activeTab === 'email' ? "Email Content" : "WhatsApp Text Content"}
                  </label>
                  <textarea
                    placeholder={
                      activeTab === 'email' 
                        ? "Write your email body here. You can use HTML syntax if desired, or plain text. Insert placeholders on the right to personalize."
                        : "Write your WhatsApp message here. Keep it short and engaging."
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full min-h-[260px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {activeTab === 'email' && (
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

                {activeTab === 'email' && showHeader && (
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

                {activeTab === 'email' && brochureAttached && (
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
                  <p className="text-xs text-slate-500 mt-0.5">Click any variable below to insert it at the cursor position in the template content</p>
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
                disabled={pending || !templateName.trim() || (activeTab === 'email' && !subject.trim()) || !content.trim()}
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
                  {selectedTemplate.channel === 'whatsapp' ? 'WhatsApp Template Preview' : 'Email Template Preview'}
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
                  <div className="bg-[#f4f8fb] p-6 rounded-xl border border-slate-200 max-w-2xl mx-auto shadow-inner w-full">
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

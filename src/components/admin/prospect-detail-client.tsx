"use client";

import { useState, useRef, useEffect } from "react";
import { updateProspect, updateProspectStatus, sendCampaignEmail } from "@/app/admin/actions";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Edit2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Paperclip,
  Eye,
  MousePointerClick,
  MessageSquare,
  Send,
  ChevronDown,
  Loader2
} from "lucide-react";
import { FormattedDate } from "./formatted-date";

const statusBadgeColors = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  contacted: "bg-blue-100 text-blue-700 border-blue-200",
  opened: "bg-emerald-100 text-emerald-700 border-emerald-200",
  clicked: "bg-purple-100 text-purple-700 border-purple-200",
  replied: "bg-cyan-100 text-cyan-700 border-cyan-200",
  demo_requested: "bg-orange-100 text-orange-700 border-orange-200",
  trial_started: "bg-amber-100 text-amber-700 border-amber-200",
  converted: "bg-green-100 text-green-700 border-green-200",
  lost: "bg-red-100 text-red-700 border-red-200"
};

const statusIcons = {
  sent: Send,
  delivered: CheckCircle2,
  opened: Eye,
  clicked: MousePointerClick,
  replied: MessageSquare,
  failed: AlertCircle
};

interface ProspectDetailClientProps {
  prospect: any;
  emailHistory: any[];
  historyFilters?: Record<string, string | undefined>;
  customTemplates?: any[];
}

export function ProspectDetailClient({ 
  prospect, 
  emailHistory,
  historyFilters = {},
  customTemplates = []
}: ProspectDetailClientProps) {
  const router = useRouter();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [localProspect, setLocalProspect] = useState<any>(prospect);
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
    customTemplates[0]?.id
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailResult, setSendEmailResult] = useState<{ 
    success: boolean; 
    count?: number; 
    failedCount?: number; 
    error?: string; 
    errorKind?: string 
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      await updateProspectStatus(localProspect.id, newStatus);
      setLocalProspect((prev: any) => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEdit = async (formData: FormData) => {
    setEditMessage("");
    const values = Object.fromEntries(formData.entries());
    const result = await updateProspect(localProspect.id, values);
    if (result.success) {
      setLocalProspect(result.data);
      setIsEditing(false);
      setEditMessage("Prospect updated.");
    } else {
      setEditMessage(result.error ?? "Could not update prospect.");
    }
  };

  const handleSendEmail = async () => {
    if (!selectedTemplateId) return;
    setIsSendingEmail(true);
    setSendEmailResult(null);
    try {
      const result = await sendCampaignEmail([localProspect.id], selectedTemplateId);
      setSendEmailResult(result);
      router.refresh();
    } catch (error) {
      setSendEmailResult({ success: false, error: "Failed to send email" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const selectedTemplate = customTemplates.find(t => t.id === selectedTemplateId);

  if (!localProspect) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-8 text-center">
        <p className="text-slate-500">Prospect not found.</p>
        <button 
          onClick={() => router.back()}
          className="mt-4 text-brand-blue hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <button 
        onClick={() => router.push("/admin/prospects")}
        className="mb-6 flex items-center gap-2 text-slate-600 hover:text-brand-blue transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to prospects
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Prospect Info Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-ink">{localProspect.name || "Unnamed prospect"}</h1>
                {localProspect.company_name && (
                  <p className="text-sm text-slate-500">{localProspect.company_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsEditing((value) => !value)} className="text-slate-400 hover:text-brand-blue transition-colors" aria-label="Edit prospect">
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {localProspect.email && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a href={`mailto:${localProspect.email}`} className="hover:text-brand-blue">
                    {localProspect.email}
                  </a>
                </div>
              )}
              
              {localProspect.phone && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${localProspect.phone}`} className="hover:text-brand-blue">
                    {localProspect.phone}
                  </a>
                </div>
              )}

              {(localProspect.city || localProspect.state) && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>
                    {localProspect.city}
                    {localProspect.state ? `, ${localProspect.state}` : ""}
                  </span>
                </div>
              )}

              {localProspect.loan_category && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="h-4 w-4 flex items-center justify-center text-slate-400">💰</div>
                  <span>{localProspect.loan_category}</span>
                </div>
              )}
            </div>
            {isEditing ? (
              <form action={handleEdit} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                {[
                  ["name", "Contact name"], ["company_name", "Company"], ["email", "Email"], ["phone", "Phone"],
                  ["city", "City"], ["state", "State"], ["loan_category", "Loan category"],
                  ["linkedin_url", "LinkedIn URL"], ["website_url", "Website URL"]
                ].map(([name, label]) => (
                  <label key={name} className="block text-xs font-semibold text-slate-600">{label}
                    <input name={name} defaultValue={localProspect[name] ?? ""} className="field mt-1" />
                  </label>
                ))}
                <label className="block text-xs font-semibold text-slate-600">Lead score
                  <input name="lead_score" type="number" min="0" defaultValue={localProspect.lead_score ?? 0} className="field mt-1" />
                </label>
                <input type="hidden" name="status" value={localProspect.status} />
                <label className="block text-xs font-semibold text-slate-600">Notes
                  <textarea name="notes" defaultValue={localProspect.notes ?? ""} className="field mt-1 min-h-24" />
                </label>
                <button className="btn-primary w-full">Save prospect</button>
              </form>
            ) : null}
            {editMessage ? <p className="mt-3 text-xs text-slate-600">{editMessage}</p> : null}
          </div>

          {/* Send Email Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-ink mb-3">Send Email Campaign</h3>
            {customTemplates.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">No templates available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Custom Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {selectedTemplate?.name || "Select a template"}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {customTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                            selectedTemplateId === template.id ? 'bg-blue-50 text-brand-blue' : 'text-slate-700'
                          }`}
                        >
                          <div className="text-sm font-medium">{template.name}</div>
                          {template.subject && (
                            <div className="text-xs text-slate-500 mt-1 line-clamp-1">{template.subject}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !selectedTemplateId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-blue text-white font-medium rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSendingEmail ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send Email</>
                  )}
                </button>

                {sendEmailResult && (
                  <div className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                    sendEmailResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {sendEmailResult.success ? (
                      <><CheckCircle2 className="h-4 w-4" /> Email sent successfully!</>
                    ) : (
                      <><AlertCircle className="h-4 w-4" /> {sendEmailResult.error}</>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Update Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-ink mb-3">Update Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(statusBadgeColors).map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdatingStatus || localProspect.status === status}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    localProspect.status === status
                      ? `${statusBadgeColors[status as keyof typeof statusBadgeColors]} border`
                      : "text-slate-600 hover:bg-slate-50"
                  } disabled:opacity-50`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Email History Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-ink">Activity Timeline</h2>
              <form className="mt-3 grid gap-2 sm:grid-cols-4">
                <select name="status" defaultValue={historyFilters.status ?? ""} className="field">
                  <option value="">All events</option>
                  {["sent", "delivered", "opened", "clicked", "replied", "failed", "bounced", "blocked", "spam"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input name="template" defaultValue={historyFilters.template ?? ""} placeholder="Template name" className="field" />
                <input name="from" type="date" defaultValue={historyFilters.from ?? ""} className="field" />
                <input name="to" type="date" defaultValue={historyFilters.to ?? ""} className="field" />
                <button className="btn-secondary sm:col-span-4">Filter campaign history</button>
              </form>
            </div>
            
            {emailHistory.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-500">No activity yet.</p>
              </div>
            ) : (
              <div className="px-6 py-6">
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                  
                  {/* Timeline items */}
                  <div className="space-y-8">
                    {emailHistory.map((email) => {
                      const StatusIcon = statusIcons[email.status as keyof typeof statusIcons] || Clock;
                      
                      // Create activity events for this email
                      const activities = [];
                      activities.push({
                        type: 'sent',
                        title: `Sent ${email.template_name || email.campaign_name || "Campaign"}`,
                        date: email.email_sent_at,
                        icon: Send,
                        color: "bg-blue-500"
                      });
                      if (email.opened_at) {
                        activities.push({
                          type: 'opened',
                          title: 'Opened Email',
                          date: email.opened_at,
                          icon: Eye,
                          color: "bg-emerald-500"
                        });
                      }
                      if (email.clicked_at) {
                        activities.push({
                          type: 'clicked',
                          title: 'Clicked Link',
                          date: email.clicked_at,
                          icon: MousePointerClick,
                          color: "bg-purple-500"
                        });
                      }
                      if (email.replied_at) {
                        activities.push({
                          type: 'replied',
                          title: 'Replied',
                          date: email.replied_at,
                          icon: MessageSquare,
                          color: "bg-cyan-500"
                        });
                      }
                      if (email.status === 'failed') {
                        activities.push({
                          type: 'failed',
                          title: 'Failed to Send',
                          date: email.created_at,
                          icon: AlertCircle,
                          color: "bg-red-500"
                        });
                      }

                      return activities.map((activity, idx) => (
                        <div key={`${email.id}-${idx}`} className="relative pl-10">
                          {/* Timeline dot */}
                          <div className={`absolute left-2.5 w-4 h-4 rounded-full ${activity.color} ring-4 ring-white`} />
                          
                          {/* Content */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-ink">
                                {activity.title}
                              </h4>
                              {email.template_name && idx === 0 && (
                                <span className="text-xs text-slate-500">
                                  • {email.template_name}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              <FormattedDate dateString={activity.date} />
                            </div>

                            {email.provider_response?.subject && idx === 0 && (
                              <p className="mt-2 text-sm text-slate-600">
                                {email.provider_response.subject}
                              </p>
                            )}
                          </div>
                        </div>
                      ));
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes Section */}
          {localProspect.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-ink mb-3">Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{localProspect.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

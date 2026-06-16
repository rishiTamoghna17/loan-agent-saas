"use client";

import { useState, useEffect, useRef } from "react";
import {
  Globe,
  Sparkles,
  Laptop,
  Smartphone,
  Check,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Upload,
  MessageSquare,
  FileText,
  Phone,
  Link as LinkIcon,
  ExternalLink
} from "lucide-react";

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  checked: boolean;
}

interface WebsiteWizardClientProps {
  agent: {
    id: string;
    name?: string;
    agent_name?: string;
    business_name: string | null;
    bio?: string;
    description?: string | null;
    phone?: string;
    whatsapp?: string;
    whatsapp_number?: string;
    email?: string;
    logo_url?: string | null;
    photo_url?: string | null;
    role?: string | null;
    website_slug?: string | null;
    slug?: string | null;
    chosen_theme?: string | null;
    services?: any;
    licensing_info?: string | null;
  };
  showWelcome?: boolean;
}

function compressAndResizeImage(
  file: File,
  maxDimension = 600,
  quality = 0.75,
  outputType?: "image/png" | "image/jpeg"
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Determine output mime type
        const mimeType = outputType || (file.type === "image/png" || file.type === "image/gif" ? "image/png" : "image/jpeg");

        // Fill background with white for JPEG to prevent black backgrounds on transparent PNGs/GIFs
        if (mimeType === "image/jpeg") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL(mimeType, mimeType === "image/png" ? undefined : quality));
      };
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

export function WebsiteWizardClient({ agent, showWelcome = false }: WebsiteWizardClientProps) {
  // Wizard steps: 0 (Template select), 1 (Identity), 2 (Messaging), 3 (Services), 4 (Contact)
  const [step, setStep] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(showWelcome);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(agent.chosen_theme || "authority");

  // File upload states (as base64 data URLs)
  const [logoPreview, setLogoPreview] = useState<string>(agent.logo_url || "");
  const [photoPreview, setPhotoPreview] = useState<string>(agent.photo_url || "");

  // Services state (editable descriptions)
  const [services, setServices] = useState<ServiceItem[]>(() => {
    const defaults = [
      {
        id: "srv-1",
        title: "Conventional Mortgages",
        description: "Traditional fixed and adjustable-rate home loans with flexible down payment options and terms.",
        checked: true
      },
      {
        id: "srv-2",
        title: "FHA Purchase Loans",
        description: "Federal Housing Administration loans designed for first-time buyers with lower credit or down payments.",
        checked: true
      },
      {
        id: "srv-3",
        title: "Refinancing & Rate Reductions",
        description: "Lower your monthly payments, reduce your interest rate, or cash out home equity.",
        checked: true
      },
      {
        id: "srv-4",
        title: "VA Veteran Loans",
        description: "Exclusive government-backed loans featuring zero down payment requirements for active duty and veterans.",
        checked: false
      },
      {
        id: "srv-5",
        title: "Jumbo & High-Value Mortgages",
        description: "Customized financing solutions for luxury home purchases that exceed standard loan limits.",
        checked: false
      }
    ];

    if (agent.services && Array.isArray(agent.services)) {
      return defaults.map(def => {
        const matching = (agent.services as any[]).find((s: any) => s.title === def.title);
        if (matching) {
          return {
            ...def,
            description: matching.description || def.description,
            checked: true
          };
        }
        return { ...def, checked: false };
      });
    }
    return defaults;
  });

  // Main Form fields
  const [formData, setFormData] = useState({
    name: agent.agent_name || agent.name || "",
    role: agent.role || "Senior Mortgage Consultant",
    company: agent.business_name || "",
    headline: "Custom Mortgage Solutions Scoped For Your Goals",
    bio: agent.description || agent.bio || "Marcus is dedicated to helping families navigate the home purchase process. With deep local ties and over 15 years of industry experience, he coordinates personalized terms and loans.",
    phone: agent.phone || "",
    whatsapp: agent.whatsapp_number || agent.whatsapp || "",
    email: agent.email || "",
    licensingInfo: agent.licensing_info || ""
  });

  // Preview options
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [buildSuccess, setBuildSuccess] = useState(false);
  const [compiledUrl, setCompiledUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Handler for text inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handler for image uploads (compresses, resizes, and converts to base64 DataURL)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "photo") => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Limit logo to max 200px width/height and photo to max 400px width/height
        const maxDim = type === "logo" ? 200 : 400;
        const mimeType = type === "logo" ? "image/png" : "image/jpeg";
        const compressedBase64 = await compressAndResizeImage(file, maxDim, 0.7, mimeType);
        if (type === "logo") {
          setLogoPreview(compressedBase64);
        } else {
          setPhotoPreview(compressedBase64);
        }
      } catch (err) {
        console.error("Failed to compress image, using fallback reader:", err);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (type === "logo") {
            setLogoPreview(reader.result as string);
          } else {
            setPhotoPreview(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Toggle service checked
  const toggleService = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  };

  // Update service texts
  const handleServiceChange = (id: string, field: "title" | "description", value: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Execute GitHub API website publishing workflow
  const triggerHugoBuild = async () => {
    setIsGenerating(true);
    setErrorMessage("");
    setBuildLogs(["1. Saving profile details to database...", "2. Formatting YAML Front Matter structures..."]);

    const addLog = (log: string, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setBuildLogs(prev => [...prev, log]);
          resolve();
        }, delay);
      });
    };

    await addLog("3. Generating clean static site markdown files...", 800);
    await addLog("4. Pushing static files to repository (GitHub Contents API)...", 800);

    try {
      const selectedServices = services
        .filter(s => s.checked)
        .map(s => ({ title: s.title, description: s.description }));

      const response = await fetch("/api/website/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          company: formData.company,
          phone: formData.phone,
          email: formData.email,
          whatsapp: formData.whatsapp,
          licensing_info: formData.licensingInfo,
          logo: logoPreview,
          photo: photoPreview,
          chosen_theme: selectedTemplate,
          bio: formData.bio,
          services: selectedServices
        })
      });

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Server returned non-JSON response (HTTP ${response.status}): ${responseText.slice(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(result.details || result.error || "Publishing failed.");
      }

      await addLog("5. Site content deployed to GitHub successfully!", 500);

      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const portSuffix = isLocal && window.location.port ? `:${window.location.port}` : "";
      const domain = isLocal
        ? `http://${window.location.hostname}${portSuffix}/agent/${result.website_slug}`
        : `${process.env.NEXT_PUBLIC_APP_HOST}/agent/${result.website_slug}`;

      setCompiledUrl(domain);
      setBuildSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Something went wrong.");
      setBuildLogs(prev => [...prev, `❌ Publishing Error: ${err.message || String(err)}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper styles based on template
  const getTemplateStyles = () => {
    switch (selectedTemplate) {
      case "minimal":
        return {
          wrapper: "font-sans bg-slate-50 text-slate-800",
          nav: "border-b border-slate-200 bg-white py-4 px-6 flex justify-between items-center",
          logo: "font-serif text-xl font-bold tracking-tight text-slate-900",
          hero: "py-16 px-8 text-left border-b border-slate-200 bg-slate-50",
          heroTitle: "font-serif text-3xl font-normal leading-tight text-slate-900 max-w-xl",
          heroSubtitle: "text-slate-600 text-sm mt-4 max-w-lg",
          btn: "inline-block bg-slate-900 text-white font-medium text-xs px-5 py-2.5 rounded-sm hover:bg-slate-800 tracking-wider uppercase mt-6",
          section: "py-12 px-8 border-b border-slate-100",
          secTitle: "font-serif text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6",
          grid: "space-y-6",
          card: "border-l border-slate-300 pl-4 py-1",
          cardTitle: "text-sm font-bold text-slate-900",
          cardDesc: "text-xs text-slate-600 mt-1",
          footer: "bg-white border-t border-slate-200 py-10 px-8 text-xs text-slate-500 text-left",
          badge: "hidden"
        };
      case "brand":
        return {
          wrapper: "font-sans bg-amber-50/20 text-slate-900",
          nav: "bg-slate-900 py-4 px-6 flex justify-between items-center text-white",
          logo: "font-bold text-lg tracking-tight text-amber-500",
          hero: "py-16 px-6 text-center bg-gradient-to-b from-slate-900 to-slate-800 text-white relative overflow-hidden",
          heroTitle: "text-2xl lg:text-3xl font-extrabold text-white leading-tight",
          heroSubtitle: "text-slate-300 text-xs mt-3 max-w-md mx-auto",
          btn: "inline-block bg-amber-500 text-slate-950 font-bold text-xs px-6 py-3 rounded-full hover:bg-amber-400 mt-6 shadow-lg shadow-amber-500/20",
          section: "py-12 px-6",
          secTitle: "text-lg font-extrabold text-slate-950 text-center mb-8 relative inline-block border-b-2 border-amber-500 pb-1",
          grid: "grid grid-cols-1 gap-4",
          card: "bg-white border border-amber-100 rounded-xl p-5 text-center shadow-sm hover:border-amber-300 transition-colors",
          cardTitle: "text-sm font-extrabold text-slate-900",
          cardDesc: "text-xs text-slate-600 mt-2",
          footer: "bg-slate-900 text-slate-400 py-10 px-6 text-xs text-center border-t border-slate-800",
          badge: "inline-block bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full mb-3"
        };
      case "authority":
      default:
        return {
          wrapper: "font-sans bg-slate-950 text-slate-100",
          nav: "backdrop-blur-md bg-slate-900/80 border-b border-slate-800 py-4 px-6 flex justify-between items-center sticky top-0",
          logo: "font-extrabold text-lg tracking-wider bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent",
          hero: "py-20 px-8 text-center bg-gradient-to-b from-teal-950/20 via-transparent to-transparent",
          heroTitle: "text-3xl font-extrabold text-white leading-tight tracking-tight",
          heroSubtitle: "text-slate-400 text-sm mt-4 max-w-lg mx-auto",
          btn: "inline-block bg-teal-500 text-slate-950 font-extrabold text-xs px-6 py-3 rounded-md hover:bg-teal-400 mt-6 transition-all shadow-md shadow-teal-500/10 hover:-translate-y-0.5",
          section: "py-14 px-8 border-t border-slate-900",
          secTitle: "text-xl font-black text-white text-center mb-8",
          grid: "grid grid-cols-1 gap-4",
          card: "bg-slate-900/50 border border-slate-800 rounded-lg p-5 hover:border-teal-500/30 transition-all",
          cardTitle: "text-sm font-bold text-white flex items-center gap-2",
          cardDesc: "text-xs text-slate-400 mt-2",
          footer: "bg-slate-950 border-t border-slate-900 py-10 px-8 text-xs text-slate-500 text-center",
          badge: "inline-block bg-teal-500/10 text-teal-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-3 border border-teal-500/20"
        };
    }
  };

  const previewStyles = getTemplateStyles();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {welcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center space-y-6 transform transition-all">
            <div className="mx-auto w-16 h-16 bg-teal-500/10 border border-teal-500/30 rounded-full flex items-center justify-center text-teal-400">
              <Sparkles className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">Your account is ready.</h3>
              <p className="text-slate-400 text-sm">Now let&apos;s build your website.</p>
            </div>
            <button
              onClick={() => setWelcomeOpen(false)}
              className="w-full py-3 px-6 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/10"
            >
              Let&apos;s Start
            </button>
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-teal-400 animate-pulse" />
            Website Wizard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Build and launch a gorgeous static website for your clients in under two minutes.
          </p>
        </div>
      </div>

      {/* Main Grid: Forms / Previews */}
      {step === 0 ? (
        /* TEMPLATE SELECTION GALLERY */
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white mb-4">Choose Your Visual Direction</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Template Card: Modern Authority */}
            <div
              onClick={() => {
                setSelectedTemplate("authority");
                setStep(1);
              }}
              className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-teal-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-500/5"
            >
              {/* Mini Preview Box */}
              <div className="h-40 rounded-xl bg-slate-950 border border-slate-800 mb-5 overflow-hidden flex flex-col p-4 relative">
                <div className="h-2 w-16 bg-teal-500 rounded-full mb-3"></div>
                <div className="space-y-1.5 mb-4">
                  <div className="h-3 w-3/4 bg-white rounded-full"></div>
                  <div className="h-2 w-1/2 bg-slate-700 rounded-full"></div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <div className="h-10 bg-slate-900 border border-slate-800 rounded p-1.5 flex flex-col justify-between">
                    <div className="h-1.5 w-6 bg-teal-500 rounded-full"></div>
                    <div className="h-1.5 w-10 bg-slate-700 rounded-full"></div>
                  </div>
                  <div className="h-10 bg-slate-900 border border-slate-800 rounded p-1.5 flex flex-col justify-between">
                    <div className="h-1.5 w-6 bg-teal-500 rounded-full"></div>
                    <div className="h-1.5 w-10 bg-slate-700 rounded-full"></div>
                  </div>
                </div>
              </div>
              <h3 className="text-base font-extrabold text-white group-hover:text-teal-400 transition-colors">Modern Authority</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Uses deep slate-navy colors and striking teal details. Perfect for showing professional financial credibility.
              </p>
            </div>

            {/* Template Card: Minimal Specialist */}
            <div
              onClick={() => {
                setSelectedTemplate("minimal");
                setStep(1);
              }}
              className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-white/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-white/5"
            >
              {/* Mini Preview Box */}
              <div className="h-40 rounded-xl bg-slate-50 border border-slate-200 mb-5 overflow-hidden flex flex-col p-4 relative text-slate-800">
                <div className="h-2 w-12 bg-slate-950 rounded-full mb-3"></div>
                <div className="space-y-1.5 mb-4">
                  <div className="h-3 w-5/6 bg-slate-950 rounded-full"></div>
                  <div className="h-2 w-2/3 bg-slate-400 rounded-full"></div>
                </div>
                <div className="space-y-2 mt-auto">
                  <div className="h-1.5 w-full bg-slate-300 rounded-full"></div>
                  <div className="h-1.5 w-4/5 bg-slate-300 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-base font-extrabold text-white group-hover:text-slate-300 transition-colors">Minimal Specialist</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Clean white grids and minimal lines. Strips out distractions to put high-readability copy front and center.
              </p>
            </div>

            {/* Template Card: Personal Brand */}
            <div
              onClick={() => {
                setSelectedTemplate("brand");
                setStep(1);
              }}
              className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-amber-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/5"
            >
              {/* Mini Preview Box */}
              <div className="h-40 rounded-xl bg-slate-900 mb-5 overflow-hidden flex flex-col items-center justify-center p-4 relative">
                <div className="h-10 w-10 bg-amber-500/20 border border-amber-500 rounded-full mb-2 flex items-center justify-center text-amber-500 text-xs font-bold">Photo</div>
                <div className="h-2 w-24 bg-white rounded-full mb-1"></div>
                <div className="h-1.5 w-16 bg-slate-500 rounded-full mb-3"></div>
                <div className="h-4 w-12 bg-amber-500 rounded-full"></div>
              </div>
              <h3 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors">Personal Brand</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Highlights your face and custom values with soft amber gradients. Great for relationship-focused loan specialists.
              </p>
            </div>

          </div>
        </div>
      ) : (
        /* INTERACTIVE STEPPED FORM + LIVE PREVIEW */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* LEFT: STEPPED FORM CARD */}
          <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-2xl p-6 lg:p-8 text-white relative">

            {/* Progress indicators */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
              <button
                onClick={() => setStep(0)}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Changing Style
              </button>

              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(idx => (
                  <div
                    key={idx}
                    className={`h-1.5 w-8 rounded-full transition-all duration-300 ${idx <= step
                      ? selectedTemplate === "brand" ? "bg-amber-500" : selectedTemplate === "minimal" ? "bg-slate-300" : "bg-teal-400"
                      : "bg-slate-800"
                      }`}
                  />
                ))}
              </div>

              <span className="text-xs font-bold text-slate-500">Step {step} of 4</span>
            </div>

            {/* STEP 1: IDENTITY */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-slate-800 text-xs flex items-center justify-center font-bold">1</span>
                    Identity Details
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Specify your name, branding files, and personal portrait.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Professional Role</label>
                    <input
                      type="text"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      placeholder="e.g. Senior Mortgage Specialist"
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Company Name</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Logo</label>
                      <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 text-slate-500 mb-1" />
                        <span className="text-[10px] text-slate-400 font-semibold">Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "logo")}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Profile Photo</label>
                      <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 text-slate-500 mb-1" />
                        <span className="text-[10px] text-slate-400 font-semibold">Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "photo")}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: MESSAGING */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-slate-800 text-xs flex items-center justify-center font-bold">2</span>
                    Messaging & Statements
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Set the primary headline and professional narrative for the website.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Hero Headline</label>
                    <input
                      type="text"
                      name="headline"
                      value={formData.headline}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Biography Summary</label>
                    <textarea
                      name="bio"
                      rows={5}
                      value={formData.bio}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SERVICES */}
            {step === 3 && (
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-slate-800 text-xs flex items-center justify-center font-bold">3</span>
                    Loan Programs Offered
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Check the products you support and modify their descriptions directly.</p>
                </div>

                <div className="space-y-4">
                  {services.map((service, index) => (
                    <div
                      key={service.id}
                      className={`border rounded-xl p-4 transition-colors ${service.checked ? "bg-slate-950/50 border-teal-500/40" : "bg-slate-950/10 border-slate-800"
                        }`}
                    >
                      <div className="flex items-start gap-3 mb-2.5">
                        <input
                          type="checkbox"
                          checked={service.checked}
                          onChange={() => toggleService(service.id)}
                          className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-teal-500 mt-1 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={service.title}
                          onChange={(e) => handleServiceChange(service.id, "title", e.target.value)}
                          className="bg-transparent border-0 font-bold text-sm text-white focus:outline-none p-0 w-full"
                          disabled={!service.checked}
                        />
                      </div>

                      <textarea
                        value={service.description}
                        onChange={(e) => handleServiceChange(service.id, "description", e.target.value)}
                        rows={2}
                        className="bg-transparent border-0 text-xs text-slate-400 focus:outline-none p-0 w-full resize-none leading-relaxed"
                        disabled={!service.checked}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: CONTACT */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-slate-800 text-xs flex items-center justify-center font-bold">4</span>
                    Contact Methods
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">Specify how prospects can reach you (displayed in footers and links).</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">WhatsApp Link / Number</label>
                    <input
                      type="text"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">REGISTRATION / LICENSING INFO (OPTIONAL)</label>
                    <input
                      type="text"
                      name="licensingInfo"
                      value={formData.licensingInfo}
                      onChange={handleInputChange}
                      placeholder="e.g., NMLS #123456 or RERA Reg No."
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Back / Next buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800">
              <button
                onClick={() => setStep(prev => prev - 1)}
                className="btn border border-slate-800 text-xs hover:bg-slate-850 px-4 py-2"
              >
                Back
              </button>

              {step < 4 ? (
                <button
                  onClick={() => setStep(prev => prev + 1)}
                  className={`btn flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-lg ${selectedTemplate === "brand" ? "bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold" : selectedTemplate === "minimal" ? "bg-slate-100 text-slate-900 hover:bg-slate-200 font-bold" : "bg-teal-500 text-slate-950 hover:bg-teal-400 font-extrabold"
                    }`}
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={triggerHugoBuild}
                  className={`btn flex items-center gap-1.5 text-xs px-6 py-3 rounded-lg font-extrabold animate-pulse ${selectedTemplate === "brand" ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20" : selectedTemplate === "minimal" ? "bg-slate-100 text-slate-900 hover:bg-slate-200" : "bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-lg shadow-teal-500/20"
                    }`}
                >
                  Generate Site <Sparkles className="h-4 w-4" />
                </button>
              )}
            </div>

          </div>

          {/* RIGHT: REAL-TIME LIVE PREVIEW PANEL */}
          <div className="space-y-4">
            {/* Viewport toggle bar */}
            <div className="flex justify-between items-center px-4 py-2 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-slate-500" />
                Real-Time Live Canvas
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`p-1.5 rounded-md transition-colors ${previewMode === "desktop" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-350"}`}
                  title="Desktop View"
                >
                  <Laptop className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`p-1.5 rounded-md transition-colors ${previewMode === "mobile" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-350"}`}
                  title="Mobile View"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Preview Viewport Frame */}
            <div className="flex justify-center transition-all duration-500 ease-out">
              <div
                className={`transition-all duration-500 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] ${previewMode === "desktop" ? "w-full" : "w-[320px]"
                  }`}
              >
                {/* Mock Browser Header */}
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center gap-2 shrink-0">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500/80"></span>
                    <span className="h-2 w-2 rounded-full bg-yellow-500/80"></span>
                    <span className="h-2 w-2 rounded-full bg-green-500/80"></span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-md py-0.5 px-3 flex-1 text-center text-[10px] text-slate-500 truncate select-none">
                    {process.env.NEXT_PUBLIC_APP_HOST}/agent/{agent.website_slug || agent.slug || "specialist"}
                  </div>
                </div>

                {/* Simulated Webpage Body */}
                <div className={`flex-1 overflow-y-auto ${previewStyles.wrapper}`}>

                  {/* Navbar */}
                  <div className={previewStyles.nav}>
                    <div className={previewStyles.logo}>
                      {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreview} alt="Logo" className="h-6 object-contain" />
                      ) : (
                        formData.company || formData.name || "Specialist"
                      )}
                    </div>
                    <div className="flex gap-3 text-[10px] font-bold text-slate-400">
                      <span>Home</span>
                      <span>About</span>
                      <span>Services</span>
                    </div>
                  </div>

                  {/* Hero Section */}
                  <div className={previewStyles.hero}>
                    <div className="relative z-10">
                      <span className={previewStyles.badge}>Certified Professional</span>
                      <h1 className={previewStyles.heroTitle}>
                        {formData.headline || "Custom Loan Options"}
                      </h1>
                      <p className={previewStyles.heroSubtitle}>
                        Provided by {formData.name || "Agent Specialist"} at {formData.company || "LeadHub Financial"}.
                      </p>

                      {selectedTemplate === "brand" && photoPreview && (
                        <div className="mt-5 flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoPreview} alt="Portrait" className="h-20 w-20 rounded-full object-cover border-2 border-amber-500 shadow-md" />
                        </div>
                      )}

                      <span className={previewStyles.btn}>Get Started</span>
                    </div>
                  </div>

                  {/* Profile / Bio Section */}
                  <div className={previewStyles.section}>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="flex-1">
                        <h2 className={previewStyles.secTitle}>About Me</h2>
                        <p className="text-xs leading-relaxed opacity-80">{formData.bio}</p>
                      </div>

                      {selectedTemplate !== "brand" && photoPreview && (
                        <div className="shrink-0 mx-auto">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoPreview} alt="Portrait" className="h-24 w-24 rounded-lg object-cover border border-slate-700" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Services Grid Section */}
                  <div className={previewStyles.section}>
                    <h2 className={previewStyles.secTitle}>Specialized Solutions</h2>
                    <div className={previewStyles.grid}>
                      {services
                        .filter(s => s.checked)
                        .map(service => (
                          <div key={service.id} className={previewStyles.card}>
                            <h3 className={previewStyles.cardTitle}>
                              {selectedTemplate === "authority" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 block shrink-0"></span>
                              )}
                              {service.title}
                            </h3>
                            <p className={previewStyles.cardDesc}>{service.description}</p>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className={previewStyles.footer}>
                    <p className="font-bold text-slate-350">{formData.company || formData.name}</p>
                    <p className="opacity-60 mt-1">Licensed Mortgage Representative</p>
                    <div className="flex justify-center gap-4 mt-4 text-[10px] opacity-75">
                      {formData.phone && <span>📞 {formData.phone}</span>}
                      {formData.email && <span>✉️ {formData.email}</span>}
                    </div>
                    <p className="opacity-40 text-[9px] mt-6">&copy; {new Date().getFullYear()} {formData.name}. Powered by Hugo.</p>
                  </div>

                </div>

              </div>
            </div>
          </div>

        </div>
      )}

      {/* COMPILING DIALOG LOGS / SUCCESS MODAL */}
      {(isGenerating || buildSuccess || errorMessage) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 lg:p-8 text-white">

            {/* BUILD SUCCESS CONTAINER */}
            {buildSuccess ? (
              <div className="text-center space-y-6">
                <div className="h-16 w-16 bg-teal-500/10 border border-teal-500 rounded-full flex items-center justify-center mx-auto text-teal-400">
                  <Check className="h-8 w-8" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Your Site is Live!</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Hugo completed static code compilation successfully.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Public Link</p>
                    <p className="text-xs font-semibold text-white truncate mt-0.5">
                      {compiledUrl.replace(/^https?:\/\//, "")}
                    </p>
                  </div>
                  <a
                    href={compiledUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-4 py-2 bg-teal-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-teal-400 shrink-0"
                  >
                    View Live <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => {
                      setBuildSuccess(false);
                      setStep(0);
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Back to Wizard
                  </button>
                </div>
              </div>
            ) : (
              /* PROGRESS / COMPILE LOGS CONTAINER */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 text-teal-400 animate-spin" />
                    ) : (
                      <span className="text-red-500">❌</span>
                    )}
                    Hugo Compiler Pipeline
                  </h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono uppercase">Status Log</span>
                </div>

                <div className="bg-slate-950 border border-slate-805 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-2 h-48 overflow-y-auto leading-relaxed border-l-2 border-l-teal-500">
                  {buildLogs.map((log, idx) => (
                    <p key={idx} className={log.startsWith("❌") ? "text-red-400" : log.startsWith("5.") ? "text-teal-400 font-bold" : ""}>
                      {log}
                    </p>
                  ))}
                </div>

                {errorMessage ? (
                  <div className="space-y-4">
                    <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-lg leading-relaxed">
                      {errorMessage}
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsGenerating(false);
                          setErrorMessage("");
                        }}
                        className="btn border border-slate-800 text-xs px-4 py-2 hover:bg-slate-850"
                      >
                        Modify Details
                      </button>
                      <button
                        onClick={triggerHugoBuild}
                        className="btn bg-teal-500 text-slate-950 font-bold text-xs px-5 py-2.5 hover:bg-teal-400"
                      >
                        Retry Compile
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-500">
                    Do not close this modal. Compiling markdown content templates.
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}



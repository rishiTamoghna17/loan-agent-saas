import { notFound } from "next/navigation";
import { BadgeIndianRupee, CheckCircle2, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { AgentVisitTracker, TrackableWhatsAppLink } from "@/components/public/agent-analytics";
import { EmiCalculator } from "@/components/public/emi-calculator";
import { LeadForm } from "@/components/public/lead-form";
import { LOAN_PRODUCTS } from "@/lib/constants";
import { normalizePhoneForWhatsApp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function AgentPublicPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: agent } = await supabase.from("agents").select("*").eq("slug", params.slug).single();

  if (!agent) notFound();

  const services: string[] = agent.services_offered?.length ? agent.services_offered : [...LOAN_PRODUCTS];
  const primaryColor = agent.primary_color || "#1769ff";
  const heroTitle = agent.hero_title || agent.business_name;
  const heroSubtitle =
    agent.hero_subtitle ||
    agent.description ||
    `Trusted loan assistance from ${agent.agent_name}. Compare options, check eligibility, and get quick support on WhatsApp.`;
  const whatsappUrl = `https://wa.me/${normalizePhoneForWhatsApp(agent.whatsapp_number)}?text=${encodeURIComponent(
    `Hi ${agent.agent_name}, I want to know more about loan options.`
  )}`;

  const address = `${agent.city}, ${agent.district}, ${agent.state} - ${agent.pincode}`;

  return (
    <main className="min-h-screen bg-white" style={{ ["--agent-primary" as string]: primaryColor }}>
      <AgentVisitTracker agentId={agent.id} slug={agent.slug} />
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:py-12">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
                {agent.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.logo_url} alt={agent.business_name} className="h-14 w-14 rounded-md object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-brand-blue">{agent.business_name.slice(0, 1)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: primaryColor }}>
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{address}</span>
                </p>
                <h1 className="mt-1 text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">{heroTitle}</h1>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{heroSubtitle}</p>
            {agent.banner_image_url ? (
              <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agent.banner_image_url} alt={`${agent.business_name} banner`} className="h-56 w-full object-cover sm:h-64" />
              </div>
            ) : null}
            <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="font-semibold text-ink">{agent.agent_name}</p>
                <p className="text-slate-500">Loan advisor</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="font-semibold text-ink">{services.length}+ products</p>
                <p className="text-slate-500">Loans and finance</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="font-semibold text-ink">WhatsApp support</p>
                <p className="text-slate-500">Fast callback</p>
              </div>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#lead-form" className="btn-primary" style={{ backgroundColor: primaryColor }}>
                Apply now
              </a>
              <TrackableWhatsAppLink
                agentId={agent.id}
                href={whatsappUrl}
                className="btn-whatsapp"
                metadata={{ location: "public_hero", slug: agent.slug }}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </TrackableWhatsAppLink>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loan products</p>
                <h2 className="mt-1 text-xl font-bold text-ink">Services offered</h2>
              </div>
              <ShieldCheck className="h-6 w-6 text-brand-green" />
            </div>
            <div className="mt-5 grid max-h-[430px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {services.map((service) => (
                <div key={service} className="flex min-h-12 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <BadgeIndianRupee className="h-4 w-4 shrink-0 text-brand-green" />
                  <span className="text-sm font-semibold text-slate-800">{service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-8 md:grid-cols-3">
        {["Fast eligibility checks", "Multiple loan categories", "WhatsApp-first support"].map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <CheckCircle2 className="mb-3 h-5 w-5 text-brand-green" />
            <h2 className="font-semibold text-ink">{item}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Clear guidance from application to documentation and follow-up.</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 pt-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,1.1fr)]">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-xl font-bold text-ink">About {agent.agent_name}</h2>
            <p className="mt-3 leading-7 text-slate-600">
              {agent.agent_name} helps customers in {agent.city}, {agent.district} find suitable loan and financial products with simple communication and quick callbacks.
            </p>
          </div>
          <EmiCalculator />
          <div className="card p-5">
            <h2 className="text-xl font-bold text-ink">Contact details</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-blue" /> {agent.phone}</p>
              <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-brand-green" /> {agent.whatsapp_number}</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-blue" /> {agent.city}, {agent.district}, {agent.state} - {agent.pincode}</p>
              {agent.landmark ? <p className="pl-6 text-xs text-slate-500">Landmark: {agent.landmark}</p> : null}
            </div>
          </div>
        </div>
        <div id="lead-form">
          <LeadForm 
            agentId={agent.id} 
            isTrialExpired={agent.plan_status === "expired" || (agent.plan_status === "trial" && new Date(agent.trial_ends_at).getTime() <= Date.now())}
            agentName={agent.agent_name}
          />
        </div>
      </section>
    </main>
  );
}

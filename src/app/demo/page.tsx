import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Phone,
  UserRound
} from "lucide-react";
import { DemoEnquiryForm } from "@/components/demo/demo-enquiry-form";
import { LeadHubMark } from "@/components/brand/lead-hub-mark";
import { EmiCalculator } from "@/components/public/emi-calculator";
import { LinkTracker } from "@/components/demo/link-tracker";
import { LOAN_PRODUCTS } from "@/lib/constants";

const demoServices = LOAN_PRODUCTS.slice(0, 10);

const demoLeads = [
  { name: "Rahul Sharma", loan: "Home Loan", amount: "₹25,00,000", source: "Google", status: "New" },
  { name: "Priya Mehta", loan: "Business Loan", amount: "₹12,00,000", source: "Referral", status: "Follow-up" },
  { name: "Arjun Verma", loan: "Car Loan", amount: "₹8,50,000", source: "Website", status: "Closed" }
];

export default function DemoPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      <LinkTracker />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <LeadHubMark />
            <div className="min-w-0">
              <p className="font-bold text-ink">LeadHub Demo</p>
              <p className="truncate text-xs text-slate-500">Loan website + lead CRM</p>
            </div>
          </Link>
          <Link href="/signup" className="btn-primary">
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:py-14">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-2xl font-bold text-white shadow-sm">
                AL
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-brand-green">
                  <MapPin className="h-4 w-4" />
                  Bengaluru, Karnataka
                </p>
                <h1 className="mt-1 text-4xl font-bold tracking-tight text-ink sm:text-6xl">Aarav Loan Solutions</h1>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Get trusted assistance for home, business, personal, and vehicle loans with quick eligibility checks and WhatsApp support.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href="#demo-form" className="btn-primary">Apply now</a>
              <a href="#crm-preview" className="btn-whatsapp">
                <MessageCircle className="h-4 w-4" />
                See agent CRM
              </a>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Aarav Mehta", "Loan advisor"],
                ["18+ products", "Loans and finance"],
                ["WhatsApp support", "Fast callback"]
              ].map(([title, detail]) => (
                <div key={title} className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="font-semibold text-ink">{title}</p>
                  <p className="text-sm text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loan products</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Services offered</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {demoServices.map((service) => (
                <div key={service} className="flex min-h-12 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <BadgeIndianRupee className="h-4 w-4 shrink-0 text-brand-green" />
                  <span className="text-sm font-semibold text-slate-800">{service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-5 md:grid-cols-3">
        {[
          ["Professional website", "Share one clear page for all loan products."],
          ["Structured enquiries", "Receive complete customer requirements."],
          ["Faster follow-up", "Contact every lead through WhatsApp and notes."]
        ].map(([title, detail]) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <CheckCircle2 className="mb-3 h-5 w-5 text-brand-green" />
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,1.1fr)]">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="text-xl font-bold text-ink">About Aarav</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Aarav helps customers compare suitable loan products, prepare documents, and receive clear updates throughout the application process.
            </p>
          </div>
          <EmiCalculator />
          <div className="card p-5">
            <h2 className="text-xl font-bold text-ink">Contact details</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-blue" /> +91 90000 00000</p>
              <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-brand-green" /> WhatsApp callback available</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-blue" /> Bengaluru, Karnataka</p>
            </div>
          </div>
        </div>
        <div id="demo-form">
          <DemoEnquiryForm />
        </div>
      </section>

      <section id="crm-preview" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-brand-blue">Agent dashboard preview</p>
              <h2 className="mt-1 text-3xl font-bold text-ink">Every enquiry, follow-up, and result in one place.</h2>
            </div>
            <Link href="/signup" className="btn-primary">
              Create your LeadHub
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [LayoutDashboard, "Total leads", "48"],
              [Clock3, "Follow-up", "12"],
              [CheckCircle2, "Closed", "9"],
              [BarChart3, "Conversion", "18%"]
            ].map(([Icon, label, value]) => {
              const MetricIcon = Icon as typeof LayoutDashboard;
              return (
                <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <MetricIcon className="h-5 w-5 text-brand-blue" />
                  <p className="mt-4 text-sm font-medium text-slate-500">{String(label)}</p>
                  <p className="mt-1 text-3xl font-bold text-ink">{String(value)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-bold text-ink">Recent leads</h3>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Download className="h-4 w-4" />
                Export CSV
              </span>
            </div>
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {["Name", "Loan type", "Amount", "Source", "Status", "Action"].map((heading) => (
                    <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demoLeads.map((lead) => (
                  <tr key={lead.name}>
                    <td className="px-5 py-4 font-semibold text-ink"><span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" />{lead.name}</span></td>
                    <td className="px-5 py-4 text-slate-600">{lead.loan}</td>
                    <td className="px-5 py-4 text-slate-600">{lead.amount}</td>
                    <td className="px-5 py-4 text-slate-600">{lead.source}</td>
                    <td className="px-5 py-4"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{lead.status}</span></td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 font-semibold text-brand-green"><MessageCircle className="h-4 w-4" />Contact lead</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-5">
        <h2 className="text-3xl font-bold text-ink">Ready to launch your own loan website?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">Create your profile, choose your services, and start receiving organized enquiries with a 14-day free trial.</p>
        <Link href="/signup" className="btn-primary mt-7">
          Start your free trial
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}

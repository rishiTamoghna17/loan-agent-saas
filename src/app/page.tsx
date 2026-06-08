import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, ShieldCheck } from "lucide-react";
import { LeadHubMark } from "@/components/brand/lead-hub-mark";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-12">
        <div className="max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <LeadHubMark />
            <div>
              <p className="text-2xl font-bold text-ink">LeadHub</p>
              <p className="text-sm font-medium text-slate-500">Lead Generation • CRM • Follow-up • Conversion</p>
            </div>
          </div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            <ShieldCheck className="h-4 w-4" />
            Secure loan lead platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            Launch a loan website and convert every enquiry from one CRM.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Built for Indian loan agents who need a fast public page, WhatsApp-ready lead capture, and tenant-safe dashboard access.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary">
              Start as agent
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary">
              Login
            </Link>
          </div>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {["Public agent page", "Secure lead dashboard", "Supabase RLS"].map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <BadgeIndianRupee className="mb-3 h-5 w-5 text-brand-green" />
              <p className="font-semibold text-slate-900">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

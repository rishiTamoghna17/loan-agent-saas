"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [maskedEmail, setMaskedEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Mask the email address
  useEffect(() => {
    if (email) {
      const [local, domain] = email.split("@");
      if (local && domain) {
        setMaskedEmail(`${local[0]}***@${domain}`);
      } else {
        setMaskedEmail(email);
      }
    }
  }, [email]);

  // Handle cooldown timer ticking down
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    if (cooldown > 0) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "RESEND_COOLDOWN") {
          setCooldown(data.retry_after || 60);
          setError(data.message || "Please wait before requesting another verification email.");
        } else {
          setError(data.error || "Failed to resend verification email.");
        }
        return;
      }

      setSuccess("Verification email has been resent successfully!");
      setCooldown(60); // start a 60s cooldown on success
    } catch (err) {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="card w-full max-w-md p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-sm">
          <Mail className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Verify your email</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            We sent a verification link to <span className="font-semibold text-slate-700">{maskedEmail || "your email"}</span>. Click the link in that email to activate your account.
          </p>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-start gap-2 text-left text-sm text-emerald-800">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2 text-left text-sm text-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 pt-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || cooldown > 0}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 min-h-[44px]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>
              {cooldown > 0
                ? `Resend available in ${formatTime(cooldown)}`
                : "Resend verification email"}
            </span>
          </button>

          <div className="flex justify-between items-center text-sm pt-2">
            <Link
              href="/signup"
              className="text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Change email address
            </Link>

            <Link
              href="/login"
              className="text-slate-500 hover:text-blue-600 transition-colors font-medium"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
        <div className="card w-full max-w-md p-8 text-center flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-sm text-slate-500">Loading verification details...</p>
        </div>
      </main>
    }>
      <VerifyEmailInner />
    </Suspense>
  );
}

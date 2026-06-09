import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({
  searchParams
}: {
  searchParams: { redirectedFrom?: string; email?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <Suspense fallback={<div className="card w-full max-w-md p-6 animate-pulse bg-slate-100 h-[400px]" />}>
        <LoginForm redirectedFrom={searchParams.redirectedFrom} email={searchParams.email} />
      </Suspense>
    </main>
  );
}

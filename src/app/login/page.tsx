import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({
  searchParams
}: {
  searchParams: { redirectedFrom?: string; email?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <LoginForm redirectedFrom={searchParams.redirectedFrom} email={searchParams.email} />
    </main>
  );
}

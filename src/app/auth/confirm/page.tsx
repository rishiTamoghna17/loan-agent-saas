import { ConfirmEmailSession } from "@/components/auth/confirm-email-session";

export default function ConfirmEmailPage({
  searchParams
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next?.startsWith("/") ? searchParams.next : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <ConfirmEmailSession next={next} />
    </main>
  );
}

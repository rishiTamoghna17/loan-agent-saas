import type { Metadata } from "next";
import { AuthHashRedirect } from "@/components/auth/auth-hash-redirect";
import { ToastProvider } from "@/components/ui/toast-provider";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadHub",
  description: "Lead Generation, CRM, follow-up, and conversion platform for loan agents"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthHashRedirect />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}

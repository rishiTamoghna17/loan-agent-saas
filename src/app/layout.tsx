import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}

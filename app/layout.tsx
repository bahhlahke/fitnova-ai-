import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "FitNova AI",
  description: "AI-backed fitness coaching and tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col font-sans">
        <AuthProvider>
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}

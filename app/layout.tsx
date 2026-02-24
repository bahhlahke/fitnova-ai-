import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "FitNova AI",
  description: "AI-backed fitness coaching and tracking",
  ...(process.env.VERCEL_URL && { metadataBase: new URL(`https://${process.env.VERCEL_URL}`) }),
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
          <a
            href="#main"
            className="absolute -left-[9999px] top-4 z-[100] rounded bg-fn-teal px-4 py-2 text-fn-black outline-none ring-2 ring-white focus:left-4 focus:inline"
          >
            Skip to main content
          </a>
          <main id="main" className="flex-1 pb-20 md:pb-0" tabIndex={-1}>
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}

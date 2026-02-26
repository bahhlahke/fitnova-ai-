import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthProvider } from "@/components/auth/AuthProvider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

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
      <body className={`${manrope.variable} ${fraunces.variable} min-h-screen flex flex-col font-sans text-fn-ink antialiased`}>
        <AuthProvider>
          <a
            href="#main"
            className="absolute -left-[9999px] top-4 z-[100] rounded-lg bg-fn-primary px-4 py-2 text-white outline-none ring-2 ring-fn-ink/20 focus:left-4 focus:inline"
          >
            Skip to main content
          </a>
          {/* Desktop nav renders at top; mobile nav renders fixed at bottom */}
          <BottomNav />
          <main id="main" className="flex-1 pb-20 md:pb-0" tabIndex={-1}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

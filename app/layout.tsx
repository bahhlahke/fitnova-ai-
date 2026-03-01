import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { MetaPixel } from "@/components/tracking/MetaPixel";
import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { AiCoachPanel } from "@/components/ai/AiCoachPanel";

const DEFAULT_SITE_URL = "https://fitnova-ai.com";

function normalizeUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
}

function resolveMetadataBase(): URL {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      return new URL(normalizeUrl(siteUrl));
    } catch {
      // fall through to next source
    }
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    try {
      return new URL(normalizeUrl(vercelUrl));
    } catch {
      // fall through to default
    }
  }

  return new URL(DEFAULT_SITE_URL);
}

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

const metadataBase = resolveMetadataBase();
const siteUrl = metadataBase.toString().replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase,
  title: "FitNova AI",
  description: "AI-backed fitness coaching and tracking",
  openGraph: {
    title: "FitNova AI | The Ultimate Pro Experience",
    description: "The most advanced AI coaching engine ever built. Personalized training, metabolic autopilot, and 24/7 accountability.",
    url: siteUrl,
    siteName: "FitNova AI",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "FitNova AI Pro Experience",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitNova AI | Build your legend",
    description: "The most advanced AI coaching engine ever built. Personalized training, metabolic autopilot, and 24/7 accountability.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${fraunces.variable} min-h-screen flex flex-row font-sans text-fn-ink bg-black`}>
        <AuthProvider>
          <a
            href="#main"
            className="absolute -left-[9999px] top-4 z-[100] rounded-lg bg-fn-primary px-4 py-2 text-white outline-none ring-2 ring-fn-ink/20 focus:left-4 focus:inline"
          >
            Skip to main content
          </a>
          <Sidebar />
          <div className="flex flex-1 flex-col md:pl-64">
            <main id="main" className="flex-1 pb-20 md:pb-10" tabIndex={-1}>
              {children}
            </main>
            <BottomNav />
            <AiCoachPanel mode="launcher" />
          </div>
        </AuthProvider>
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
      </body>
    </html>
  );
}

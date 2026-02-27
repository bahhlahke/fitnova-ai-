import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { MetaPixel } from "@/components/tracking/MetaPixel";
import { Suspense } from "react";

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
  openGraph: {
    title: "FitNova AI | The Ultimate Pro Experience",
    description: "The most advanced AI coaching engine ever built. Personalized training, metabolic autopilot, and 24/7 accountability.",
    url: "https://fitnova-ai.com",
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
  ...(process.env.VERCEL_URL && { metadataBase: new URL(`https://${process.env.VERCEL_URL}`) }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${fraunces.variable} min-h-screen flex flex-col font-sans text-fn-ink`}>
        <AuthProvider>
          <a
            href="#main"
            className="absolute -left-[9999px] top-4 z-[100] rounded-lg bg-fn-primary px-4 py-2 text-white outline-none ring-2 ring-fn-ink/20 focus:left-4 focus:inline"
          >
            Skip to main content
          </a>
          <main id="main" className="flex-1 pb-20 md:pb-0" tabIndex={-1}>
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
      </body>
    </html>
  );
}

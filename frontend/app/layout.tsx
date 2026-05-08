import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pickr — AI Shopping Assistant",
  description: "Find the best products with AI-powered recommendations",
  openGraph: {
    title: "Pickr — AI Shopping Assistant",
    description: "Find the best products with AI-powered recommendations",
    url: "https://pickrshoppingassistant.vercel.app",
    type: "website",
    images: [
      {
        url: "https://pickrshoppingassistant.vercel.app/og.png",
        width: 1200,
        height: 630,
        alt: "Pickr — AI Shopping Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
      <Analytics />
      <SpeedInsights />
    </html>
  );
}

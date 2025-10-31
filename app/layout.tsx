// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

/* -------------------------------------------------
   1. METADATA – everything EXCEPT viewport/themeColor
   ------------------------------------------------- */
export const metadata: Metadata = {
  title: "Cyber Grok - Circuit Runner",
  description:
    "An exciting mobile platformer game where you guide Grok through circuit board levels, collect microchips, and avoid viruses!",
  generator: "v0.app",
  applicationName: "Cyber Grok",
  keywords: ["game", "platformer", "mobile game", "arcade", "runner", "cyber", "grok"],
  authors: [{ name: "David Gutierrez" }],
  creator: "David Gutierrez",
  publisher: "David Gutierrez",
  formatDetection: { telephone: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cyber Grok",
  },

  // ← REMOVE THESE TWO LINES (they go into separate exports below)
  // viewport: { … },
  // themeColor: "#4ECDC4",

  icons: {
    icon: [
      { url: "/icon-192.jpg", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.jpg", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.jpg", sizes: "192x192", type: "image/png" }],
  },
};

/* -------------------------------------------------
   2. VIEWPORT – the new required export
   ------------------------------------------------- */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

/* -------------------------------------------------
   3. THEME COLOR – also a separate export
   ------------------------------------------------- */
export const themeColor = "#4ECDC4";

/* -------------------------------------------------
   4. ROOT LAYOUT – unchanged (just uses the font)
   ------------------------------------------------- */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full w-full">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        {/* No <meta name="viewport"> here – it’s handled by the export above */}
      </head>
      <body className={`${geist.className} h-full w-full bg-black antialiased`}>
        <div className="h-full w-full">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}

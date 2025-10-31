// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

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
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  themeColor: "#4ECDC4",
  icons: {
    icon: [
      { url: "/icon-192.jpg", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.jpg", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.jpg", sizes: "192x192", type: "image/png" }],
  },
};

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
      </head>
      <body className={`${geist.className} h-full w-full bg-black antialiased`}>
        <div className="h-full w-full">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}

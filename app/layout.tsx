import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

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
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cyber Grok",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  themeColor: "#4ECDC4",
  icons: {
    icon: [
      { url: "/icon-192.jpg", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.jpg", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.jpg", sizes: "192x192", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full w-full">
  <head>
    <link rel="manifest" href="/manifest.json" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  </head>
  <body className="h-full w-full bg-black font-sans antialiased">
    <div className="h-full w-full game-container">
      {children}
    </div>
    <Analytics />
  </body>
</html>
  )
}

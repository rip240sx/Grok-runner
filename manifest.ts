import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cyber Grok - Circuit Runner",
    short_name: "Cyber Grok",
    description: "An exciting mobile platformer game where you guide Grok through circuit board levels",
    start_url: "/",
    display: "standalone",
    background_color: "#0a1a1a",
    theme_color: "#4ECDC4",
    orientation: "landscape",
    icons: [
      {
        src: "/icon-192.jpg",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.jpg",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    categories: ["games", "entertainment"],
  }
}

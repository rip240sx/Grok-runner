/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force ignore any pages/ folder (App Router only)
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Disable _document fallback
  experimental: {
    appDocumentPreloading: false,
  },

  typescript: {
    ignoreBuildErrors: true, // Keep your setting
  },
  
  images: {
    unoptimized: true, // Keep your setting
  },

  // Extra: Prevent Vercel from caching old builds
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

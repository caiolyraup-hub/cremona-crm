/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lookaside.fbsbx.com',
        // domínio da Meta para mídia do WhatsApp
      },
    ],
  },
}

export default nextConfig

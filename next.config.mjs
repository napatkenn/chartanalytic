/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/api/favicon", permanent: false },
      { source: "/favicon.png", destination: "/api/favicon", permanent: false },
    ];
  },
};

export default nextConfig;

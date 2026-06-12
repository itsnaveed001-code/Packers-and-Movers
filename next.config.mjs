/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework in responses.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Clickjacking: nobody may iframe this site (admin included).
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          // Block MIME-type sniffing.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't leak full URLs (booking refs in query strings) cross-origin.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // This site never needs these browser capabilities.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // Force HTTPS for 2 years once seen over HTTPS.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;

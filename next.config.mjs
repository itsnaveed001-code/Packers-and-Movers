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
          // Camera/mic/geo are never needed. The Payment Request API is
          // allowed for us + Razorpay's checkout iframe (UPI/Google Pay
          // flows inside the modal use it).
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com")' },
          // Force HTTPS for 2 years once seen over HTTPS.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          // Isolate the browsing context from cross-origin window handles,
          // but let popups we open keep their opener — Razorpay Checkout
          // opens bank/3-D Secure windows that must talk back to the page.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          // No speculative DNS lookups leaking visited-link hints.
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ];
  },
};

export default nextConfig;

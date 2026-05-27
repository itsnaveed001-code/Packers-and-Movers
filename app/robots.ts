import type { MetadataRoute } from 'next';
import { BUSINESS } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  const base = BUSINESS.siteUrl.replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/booking-confirmed'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

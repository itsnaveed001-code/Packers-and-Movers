import type { MetadataRoute } from 'next';
import { BUSINESS } from '@/lib/constants';
import { getActiveServices } from '@/lib/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BUSINESS.siteUrl.replace(/\/$/, '');
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/book`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ];

  let services: { slug: string }[] = [];
  try {
    services = await getActiveServices();
  } catch {
    // sitemap should never fail the build
  }

  const serviceEntries: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...serviceEntries];
}

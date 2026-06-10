import type { Metadata } from 'next';
import { BUSINESS } from '@/lib/constants';

// Single source of truth for per-page metadata. Next.js does NOT deep-merge the
// `openGraph` object across route segments — a child route that sets `openGraph`
// replaces the parent's entirely. So every page must emit a COMPLETE openGraph
// block, otherwise it silently loses siteName/locale/images. This helper builds
// that full object from a few inputs, and sets a per-page canonical so pages stop
// inheriting the root layout's single (wrong) canonical.
//
// `path` is a root-relative path (e.g. '/about'); Next resolves it against
// `metadataBase` (set in app/layout.tsx) into an absolute canonical + og:url.

type PageMetaInput = {
  /** Page title without the brand — the title template / OG add the brand. */
  title: string;
  description: string;
  /** Root-relative canonical path, e.g. '/' or '/services/home-shifting'. */
  path: string;
  /** Full OG/Twitter title. Defaults to `${title} — ${BUSINESS.name}`. */
  ogTitle?: string;
  /** Root-relative or absolute OG image. Defaults to the logo. */
  image?: string;
  /** Set true for pages that must not be indexed. */
  noindex?: boolean;
};

// TODO(phase-later): replace with a purpose-built 1200×630 OG image.
const DEFAULT_OG_IMAGE = '/LOGO01.svg';

export function pageMetadata({
  title,
  description,
  path,
  ogTitle,
  image,
  noindex,
}: PageMetaInput): Metadata {
  const fullOgTitle = ogTitle ?? `${title} — ${BUSINESS.name}`;
  const img = image ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: BUSINESS.name,
      url: path,
      title: fullOgTitle,
      description,
      images: [{ url: img }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullOgTitle,
      description,
      images: [img],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

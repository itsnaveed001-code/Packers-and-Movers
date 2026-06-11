import { getSiteSettings } from '@/lib/cms';
import { BUSINESS, CITIES } from '@/lib/constants';

export async function LocalBusinessJsonLd() {
  const settings = await getSiteSettings();

  const name = settings?.company_name ?? BUSINESS.name;
  const phone = settings?.phone ?? BUSINESS.phone;
  const email = settings?.email ?? BUSINESS.email;
  const address = settings?.address ?? BUSINESS.address;
  const whatsapp = settings?.whatsapp ?? BUSINESS.whatsapp;
  const siteUrl = BUSINESS.siteUrl; // canonical URL stays env-driven

  const hours = settings?.business_hours ?? {};
  const opens = parseTimeFromHours(hours.weekday, 'open') ?? '09:00';
  const closes = parseTimeFromHours(hours.weekday, 'close') ?? '19:00';

  const ratingValue =
    settings?.google_rating != null ? Number(settings.google_rating) : null;
  const hasRating = ratingValue != null && Number.isFinite(ratingValue) && ratingValue > 0;

  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MovingCompany',
    '@id': `${siteUrl}/#movingcompany`,
    name,
    url: siteUrl,
    image: `${siteUrl}/LOGO01.svg`,
    telephone: phone,
    email,
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressCountry: 'IN',
    },
    areaServed: CITIES.map((city) => ({ '@type': 'City', name: city })),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens,
        closes,
      },
    ],
    sameAs: [`https://wa.me/${whatsapp}`],
  };

  if (hasRating) {
    json.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(ratingValue),
      ...(settings?.google_reviews_url ? { url: settings.google_reviews_url } : {}),
    };
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

// "9:00 AM – 7:00 PM" → "09:00" / "19:00". Returns null if it can't parse.
function parseTimeFromHours(
  hoursStr: string | undefined,
  which: 'open' | 'close',
): string | null {
  if (!hoursStr) return null;
  // Split on en-dash or hyphen.
  const parts = hoursStr.split(/\s*[–-]\s*/);
  if (parts.length !== 2) return null;
  const target = which === 'open' ? parts[0] : parts[1];
  const match = target.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) return null;
  let h = Number(match[1]);
  const m = Number(match[2] ?? 0);
  const meridiem = (match[3] ?? '').toUpperCase();
  if (meridiem === 'PM' && h < 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

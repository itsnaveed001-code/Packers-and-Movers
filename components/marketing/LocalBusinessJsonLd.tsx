import { BUSINESS, CITIES, STATS } from '@/lib/constants';

export function LocalBusinessJsonLd() {
  // Only emit aggregateRating when we actually have a verifiable rating —
  // fabricating one risks a structured-data penalty. Phase 2 wires this to the
  // editable Google rating in site_settings.
  const ratingValue = Number.parseFloat(String(STATS.rating));
  const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;

  const json = {
    '@context': 'https://schema.org',
    '@type': 'MovingCompany',
    '@id': `${BUSINESS.siteUrl}/#movingcompany`,
    name: BUSINESS.name,
    url: BUSINESS.siteUrl,
    image: `${BUSINESS.siteUrl}/LOGO01.svg`,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address,
      addressCountry: 'IN',
    },
    areaServed: CITIES.map((city) => ({ '@type': 'City', name: city })),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '19:00',
      },
    ],
    sameAs: [`https://wa.me/${BUSINESS.whatsapp}`],
    ...(hasRating
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: String(ratingValue) } }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { ServicesGrid } from '@/components/marketing/ServicesGrid';
import { WhyChooseUs } from '@/components/marketing/WhyChooseUs';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Testimonials } from '@/components/marketing/Testimonials';
import { ServiceAreas } from '@/components/marketing/ServiceAreas';
import { LocalBusinessJsonLd } from '@/components/marketing/LocalBusinessJsonLd';
import { getActiveServices } from '@/lib/queries';
import { BUSINESS, PRIMARY_CITY } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Packers and Movers in ${PRIMARY_CITY} — ${BUSINESS.name}`,
  description: `Book trusted packers and movers in ${PRIMARY_CITY} online. Insured home shifting, office relocation, vehicle transport, and storage. Transparent pricing. Same-day quotes.`,
  alternates: { canonical: BUSINESS.siteUrl },
};

// Read services from Supabase on each request so the latest is_active state is reflected.
// (Cheap query; can be swapped to ISR with `revalidate` once you want page-level caching.)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const services = await getActiveServices();
  return (
    <>
      <LocalBusinessJsonLd />
      <Hero />
      {services.length > 0 && <ServicesGrid services={services} />}
      <WhyChooseUs />
      <HowItWorks />
      <Testimonials />
      <ServiceAreas />
    </>
  );
}

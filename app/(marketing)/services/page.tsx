import { ServicesGrid } from '@/components/marketing/ServicesGrid';
import { getActiveServices } from '@/lib/queries';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Our services',
  description:
    'Full range of moving services — home shifting, office relocation, vehicle transport, intercity moves, and secure storage.',
  path: '/services',
});

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const services = await getActiveServices();
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white py-12">
        <div className="container max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Our services</h1>
          <p className="mt-3 text-muted-foreground">
            Pick what you need — we'll handle the rest.
          </p>
        </div>
      </section>
      <ServicesGrid services={services} />
    </>
  );
}

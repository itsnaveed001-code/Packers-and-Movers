import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { StickyMobileBar } from '@/components/marketing/StickyMobileBar';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <StickyMobileBar />
      <Footer />
    </div>
  );
}

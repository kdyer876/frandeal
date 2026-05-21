import type { Metadata } from 'next';
import { PricingPage } from '@/components/PricingPage';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Free for browsing. Starter unlocks financials and 10 lead reveals/month. Pro is unlimited.',
};

export default function Page() {
  return <PricingPage />;
}

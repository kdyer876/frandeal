import type { Metadata } from 'next';
import { BrowsePage } from '@/components/BrowsePage';

export const metadata: Metadata = {
  title: 'Browse franchise resales',
  description:
    'Active franchise resale listings from BizBuySell and FranchiseGator, matched to FDD financials.',
};

export default function Page() {
  return <BrowsePage />;
}

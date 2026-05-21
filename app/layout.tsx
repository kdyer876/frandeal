import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'FranDeal — Franchise resales with FDD data built in',
    template: '%s · FranDeal',
  },
  description:
    'The marketplace for franchise resales. Search active listings from BizBuySell and FranchiseGator, with FDD financials and broker contact in one place.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://frandeal.com'),
  openGraph: {
    title: 'FranDeal',
    description:
      'Franchise resales with FDD data built in. Active listings from BizBuySell and FranchiseGator.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-white font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

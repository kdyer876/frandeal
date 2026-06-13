import type { Metadata } from 'next';
import { ListingDetail } from '@/components/ListingDetail';

export const metadata: Metadata = {
  title: 'Listing',
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListingDetail id={id} />;
}

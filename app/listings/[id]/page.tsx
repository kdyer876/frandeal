import type { Metadata } from 'next';
import { ListingDetail } from '@/components/ListingDetail';

export const metadata: Metadata = {
  title: 'Listing',
};

export default function Page({ params }: { params: { id: string } }) {
  return <ListingDetail id={params.id} />;
}

import type { Metadata } from 'next';
import { AdminQueue } from '@/components/AdminQueue';

export const metadata: Metadata = {
  title: 'Admin · Listing approvals',
};

export default function Page() {
  return <AdminQueue />;
}

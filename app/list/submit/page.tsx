import type { Metadata } from 'next';
import { SubmitListingForm } from '@/components/SubmitListingForm';

export const metadata: Metadata = {
  title: 'List a resale',
};

export default function Page() {
  return <SubmitListingForm />;
}

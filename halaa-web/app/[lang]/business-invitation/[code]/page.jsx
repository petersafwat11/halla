import BusinessGuestHub from './BusinessGuestHub';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {
  title: 'Business invitation | Halaa',
  description: 'Your private invitation.',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
  openGraph: { title: 'Business invitation | Halaa', description: 'Your private invitation.', images: [] },
  twitter: { title: 'Business invitation | Halaa', description: 'Your private invitation.', images: [] },
};

export default function Page() { return <BusinessGuestHub />; }

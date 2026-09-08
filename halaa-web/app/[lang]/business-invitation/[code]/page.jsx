import initTranslations from '@/localization/i18n';
import BusinessGuestHub from './BusinessGuestHub';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const { t } = await initTranslations(lang, ['businessGuestHub']);
  const title = t('metadata.title');
  const description = t('metadata.description');
  // Only static localized copy belongs in metadata. Never fetch a guest here.
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false, nocache: true },
    referrer: 'no-referrer',
    alternates: { canonical: null, languages: {} },
    openGraph: { title, description, images: [] },
    twitter: { title, description, images: [] },
  };
}

export default function Page() {
  return <BusinessGuestHub />;
}

import { CANONICAL_ORIGIN, canonicalUrl, pruneEmpty } from '@halaa/shared/brand';
import { LEGAL_CONTACT } from '@halaa/shared/legal/contact';

export function buildLandingSchema({ lang, faq = [], offers = [] }) {
  const url = canonicalUrl(lang);
  return pruneEmpty({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': `${CANONICAL_ORIGIN}/#organization`,
        name: LEGAL_CONTACT.brandName[lang],
        legalName: LEGAL_CONTACT.legalEntityName[lang],
        url: CANONICAL_ORIGIN, logo: `${CANONICAL_ORIGIN}/logo.png`,
        email: LEGAL_CONTACT.supportEmail.value, telephone: LEGAL_CONTACT.phone.value,
      },
      {
        '@type': 'SoftwareApplication', '@id': `${url}#application`,
        name: LEGAL_CONTACT.brandName[lang], url,
        applicationCategory: 'BusinessApplication', operatingSystem: 'Web browser',
        publisher: { '@id': `${CANONICAL_ORIGIN}/#organization` },
        offers: offers.length ? offers : undefined,
      },
      {
        '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: lang,
        mainEntity: faq.map(({ q, a }) => ({
          '@type': 'Question', name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  });
}

// Only describe the plans currently displayed; never synthesize zero-priced offers.
export function planOffers(plans, lang) {
  return plans.filter(Boolean).flatMap((plan) => {
    const price = plan.pricing?.oneTime ?? plan.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return [];
    return [{
      '@type': 'Offer',
      name: plan.name?.[lang] || (lang === 'ar' ? plan.nameAr : plan.nameEn) || plan.code,
      price, priceCurrency: plan.currency || 'SAR',
      // Keep the base price intact; disclose separately charged setup and the
      // catalog period instead of implying that base price is an all-in total.
      description: [
        ({ ar: { event: 'لكل مناسبة', monthly: 'شهري', quarterly: 'ربع سنوي', annual: 'سنوي' }, en: { event: 'Per event', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' } })[lang]?.[plan.billingType],
        plan.setupFeeAmount > 0 ? (lang === 'ar' ? `رسوم إعداد إضافية: ${plan.setupFeeAmount} ${plan.currency || 'SAR'}` : `Additional setup fee: ${plan.setupFeeAmount} ${plan.currency || 'SAR'}`) : null,
      ].filter(Boolean).join('; ') || undefined,
      url: `${canonicalUrl(lang)}#pricing`,
    }];
  });
}

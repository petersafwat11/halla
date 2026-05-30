'use client';

import { i18nRouterConfig } from '@/localization/i18nRouterConfig';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function UseLanguageChange() {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language;
  const currentPathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (newLocale) => {
    if (newLocale === currentLocale) return;
    // We could just push to the new path with the new locale, but we also
    // set the `NEXT_LOCALE` cookie so incoming visits skip i18n router
    // detection and use the chosen preference instead.
    const days = 30;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = '; expires=' + date.toUTCString();
    document.cookie = `NEXT_LOCALE=${newLocale};expires=${expires};path=/`;
    let newPath;

    if (
      // With `prefixDefault: false` the default locale is absent from the
      // URL, so we inject the new locale before the current pathname.
      currentLocale === i18nRouterConfig.defaultLocale &&
      !i18nRouterConfig.prefixDefault
    ) {
      newPath = `/${newLocale}${currentPathname}`;
    } else {
      // Otherwise the current locale is already in the URL — swap it.
      newPath = currentPathname.replace(`/${currentLocale}`, `/${newLocale}`);
    }
    const currentSearchParams = new URLSearchParams(searchParams.toString());
    const newSearchParams = currentSearchParams.toString();
    const newPathWithSearchParams = newSearchParams
      ? `${newPath}?${newSearchParams}`
      : newPath;
    window.location.href = newPathWithSearchParams;
  };

  return {
    currentLocale,
    handleChange,
  };
}

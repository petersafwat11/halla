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
    //const newLocale = e.target.value;
    //!we can just push to the new path with the new locale, but we also set the cookie to save the preferred lng for incoming visits, whereas the cookie will override the next i18n router detection
    // set cookie for next-i18n-router
    const days = 30;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = '; expires=' + date.toUTCString();
    document.cookie = `NEXT_LOCALE=${newLocale};expires=${expires};path=/`;
    let newPath;

    // redirect to the new locale path
    if (
      //* if prefixDefault option is set to false, so the defaultLocale won't be exist in the url, so we need to inject the newLocale before the currentPathname (if set to false and the newLocale = the defaultLocale, so the defaultLocale will be omitted automatically )
      currentLocale === i18nRouterConfig.defaultLocale &&
      !i18nRouterConfig.prefixDefault
    ) {
      newPath = `/${newLocale}${currentPathname}`;

      //router.push("/" + newLocale + currentPathname);
    } else {
      newPath = currentPathname.replace(`/${currentLocale}`, `/${newLocale}`);

      //* but if the prefixDefault is set to true, so the defaultLocale is already exit, so just replace it with the newLocale
      /* router.push(
        currentPathname.replace(`/${currentLocale}`, `/${newLocale}`)
      ); */
    }
    // Preserve search params
    const currentSearchParams = new URLSearchParams(searchParams.toString());
    const newSearchParams = currentSearchParams.toString();
    const newPathWithSearchParams = newSearchParams
      ? `${newPath}?${newSearchParams}`
      : newPath;
    window.location.href = newPathWithSearchParams;

    //router.refresh();
  };

  return {
    currentLocale,
    handleChange,
  };
}

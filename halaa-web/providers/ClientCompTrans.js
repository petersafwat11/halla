"use client";

import { I18nextProvider, initReactI18next } from "react-i18next";
import { createInstance } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import React, { useEffect, useMemo } from "react";

export default function ClientComponentsTranslationsProvider({
  children,
  locale,
  namespaces,
  resources,
}) {
  // Create i18n instance synchronously with resources from server.
  // initImmediate: false makes init() complete synchronously when resources
  // are pre-loaded — required so SSR-rendered client components can call
  // t(..., { returnObjects: true }) and get the array back, not the key string.
  const i18n = useMemo(() => {
    const instance = createInstance();
    instance.use(resourcesToBackend((language, namespace) =>
      import(`../localization/locales/${language}/${namespace}.json`)
    )).use(initReactI18next).init({
      showSupportNotice: false,
      lng: locale,
      fallbackLng: locale,
      supportedLngs: ["en", "ar"],
      defaultNS: namespaces[0],
      fallbackNS: namespaces[0],
      ns: namespaces,
      resources: resources || {},
      partialBundledLanguages: true,
      initImmediate: false,
      interpolation: {
        escapeValue: false,
      },
    });
    return instance;
  }, [locale, namespaces, resources]);

  // Update language when locale changes
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [i18n, locale]);

  return (
    <I18nextProvider i18n={i18n}>
    
      {children}
    </I18nextProvider>
  );
}

"use client";

import { I18nextProvider } from "react-i18next";
import { createInstance } from "i18next";
import React, { useEffect, useMemo } from "react";

export default function ClientComponentsTranslationsProvider({
  children,
  locale,
  namespaces,
  resources,
}) {
  // Create i18n instance synchronously with resources from server
  const i18n = useMemo(() => {
    const instance = createInstance();
    instance.init({
      lng: locale,
      fallbackLng: locale,
      supportedLngs: ["en", "ar"],
      defaultNS: namespaces[0],
      fallbackNS: namespaces[0],
      ns: namespaces,
      resources: resources || {},
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

import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next/initReactI18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { i18nRouterConfig } from "@/localization/i18nRouterConfig";

export default async function initTranslations(
  locale,
  namespaces,
  i18nInstance,
  resources
) {
  i18nInstance = i18nInstance || createInstance();

  i18nInstance.use(initReactI18next);
  if (!resources) {
    i18nInstance.use(
      resourcesToBackend((language, namespace) =>
        import(`./locales/${language}/${namespace}.json`)
      )
    );
  }

  await i18nInstance.init({
    lng: locale,
    resources,
    fallbackLng: i18nRouterConfig.defaultLocale,
    supportedLngs: i18nRouterConfig.locales,
    defaultNS: namespaces[0],
    fallbackNS: namespaces[0],
    ns: namespaces,
    preload: resources ? [] : i18nRouterConfig.locales,
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    // Add direction information
    dir: i18nRouterConfig.getDirection(locale),
  });

  return {
    i18n: i18nInstance,
    resources: i18nInstance.services.resourceStore.data,
    t: i18nInstance.t,
  };
}

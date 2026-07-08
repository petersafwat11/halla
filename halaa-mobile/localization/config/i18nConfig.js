import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

// Import locale files
import enTranslations from "../locales/en/index.js";
import arTranslations from "../locales/ar/index.js";

const resources = {
  en: enTranslations,
  ar: arTranslations,
};

// Configuration object
export const i18nConfig = {
  locales: ["en", "ar"],
  defaultLocale: "en",
  fallbackLocale: "en",

  // Direction mapping for each locale
  localeDirection: {
    en: "ltr",
    ar: "rtl",
  },

  // Helper function to get direction for a locale
  getDirection: (locale) => {
    return i18nConfig.localeDirection[locale] || "ltr";
  },

  // Helper function to check if locale is RTL
  isRTL: (locale) => {
    return i18nConfig.localeDirection[locale] === "rtl";
  },

  // Get device locale
  getDeviceLocale: () => {
    const locales = Localization.getLocales();
    if (Array.isArray(locales) && locales.length > 0) {
      const deviceLocale = locales[0].languageCode;
      return i18nConfig.locales.includes(deviceLocale)
        ? deviceLocale
        : i18nConfig.defaultLocale;
    }
    return i18nConfig.defaultLocale;
  },
};

// Initialize i18next only if not already initialized
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: "v3", // For React Native compatibility
    resources,
    lng: i18nConfig.defaultLocale, // Use default locale, not device locale
    fallbackLng: i18nConfig.fallbackLocale,

    interpolation: {
      escapeValue: false, // React Native already escapes by default
    },

    react: {
      useSuspense: false, // Disable suspense for React Native
    },

    debug: false, // Disable debug to reduce console noise
  });
}

export default i18n;

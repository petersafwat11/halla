export const i18nRouterConfig = {
  locales: ["en", "ar"],
  defaultLocale: "ar",
  prefixDefault: true,
  serverSetCookie: "always",

  // Direction mapping for each locale
  localeDirection: {
    en: "ltr",
    ar: "rtl",
  },

  // Helper function to get direction for a locale
  getDirection: (locale) => {
    return i18nRouterConfig.localeDirection[locale] || "ltr";
  },

  // Helper function to check if locale is RTL
  isRTL: (locale) => {
    return i18nRouterConfig.localeDirection[locale] === "rtl";
  },
  localeDetector: (request, config) => {
    //* 1- Check if NEXT_LOCALE cookie exists
    const nextLocale = request.cookies.get("NEXT_LOCALE");
    if (nextLocale && config.locales.includes(nextLocale.value)) {
      return nextLocale.value;
    }

    //* 2- If no valid cookie is found, check the Accept-Language header to get the user's browser language
    const acceptLanguage = request.headers.get("Accept-Language");
    if (acceptLanguage) {
      // Parse the Accept-Language header
      const languages = acceptLanguage
        .split(",")
        .map((lang) => lang.split(";")[0]);

      // Find the first language that matches our supported locales, whereas they are ordered by priority and quality
      for (const lang of languages) {
        const shortLang = lang.slice(0, 2).toLowerCase(); // ex. get en from en-us
        if (config.locales.includes(shortLang)) {
          return shortLang;
        }
      }
    }

    //* 3- If no matching language is found, return the default locale
    return config.defaultLocale;
  },
};

import { useTranslation as useI18nextTranslation } from "react-i18next";
import { useLanguage } from "../providers/LanguageProvider";

// Custom hook that combines react-i18next with our language context
export const useTranslation = (namespace = "common") => {
  const { t, i18n } = useI18nextTranslation(namespace);
  const { currentLanguage, isRTL, direction } = useLanguage();

  return {
    t,
    i18n,
    currentLanguage,
    isRTL,
    direction,
    // Helper function for getting translation with fallback
    translate: (key, options = {}) => {
      const translation = t(key, options);
      return translation === key ? options.fallback || key : translation;
    },
  };
};

export default useTranslation;

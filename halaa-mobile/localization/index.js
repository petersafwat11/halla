// Main localization exports
export {
  default as LanguageProvider,
  useLanguage,
} from "./providers/LanguageProvider";
export { useTranslation } from "./hooks/useTranslation";
export { default as i18n, i18nConfig } from "./config/i18nConfig";

// Re-export react-i18next components for convenience
export { Trans } from "react-i18next";

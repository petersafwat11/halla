import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { I18nManager, Alert } from "react-native";
import { I18nextProvider } from "react-i18next";
import i18n, { i18nConfig } from "../config/i18nConfig";
import { languageStorage } from "../../utils/languageStorage";

const LanguageContext = createContext({});

const LANGUAGE_STORAGE_KEY = "@app_language";

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(
    i18nConfig.defaultLocale
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);

  // Initialize language on app start
  useEffect(() => {
    initializeLanguage();
  }, []);

  // Note: Language is only changed when user explicitly selects it
  // We don't listen for device locale changes to prevent unexpected language switches

  const initializeLanguage = async () => {
    try {
      console.log("[LanguageProvider] Initializing language...");
      // Check if user has already selected a language
      const hasSelected = await languageStorage.hasSelectedLanguage();
      setHasSelectedLanguage(hasSelected);
      console.log("[LanguageProvider] Has selected language:", hasSelected);

      let selectedLang = i18nConfig.defaultLocale;

      if (hasSelected) {
        // Use saved language if user has selected one
        const savedLanguage = await languageStorage.getLanguage();
        console.log("[LanguageProvider] Saved language:", savedLanguage);
        if (savedLanguage && i18nConfig.locales.includes(savedLanguage)) {
          selectedLang = savedLanguage;
          setCurrentLanguage(savedLanguage);
          await i18n.changeLanguage(savedLanguage);
        } else {
          // Fallback to default if saved language is invalid
          setCurrentLanguage(i18nConfig.defaultLocale);
          await i18n.changeLanguage(i18nConfig.defaultLocale);
        }
      } else {
        // Don't auto-detect device language, let user choose
        // Set to default but don't mark as selected
        setCurrentLanguage(i18nConfig.defaultLocale);
        await i18n.changeLanguage(i18nConfig.defaultLocale);
      }
      console.log("[LanguageProvider] Selected language:", selectedLang);

      // Note: We don't use I18nManager in Expo Go as it doesn't work properly
      // Instead, we control RTL purely through our context and flexDirection styles
      const shouldBeRTL = i18nConfig.isRTL(selectedLang);
      console.log(
        "[LanguageProvider] Language initialized:",
        selectedLang,
        "| RTL:",
        shouldBeRTL
      );
    } catch (error) {
      console.error("Error initializing language:", error);
      // Fallback to default locale
      setCurrentLanguage(i18nConfig.defaultLocale);
      await i18n.changeLanguage(i18nConfig.defaultLocale);
      setHasSelectedLanguage(false);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (languageCode) => {
    try {
      console.log("[LanguageProvider] Changing language to:", languageCode);
      if (i18nConfig.locales.includes(languageCode)) {
        setCurrentLanguage(languageCode);
        await i18n.changeLanguage(languageCode);
        await languageStorage.saveLanguage(languageCode);
        setHasSelectedLanguage(true);

        const shouldBeRTL = i18nConfig.isRTL(languageCode);
        console.log(
          "[LanguageProvider] Language changed to:",
          languageCode,
          "| RTL:",
          shouldBeRTL
        );

        // Alert user that language will apply immediately
        Alert.alert(
          "Language Changed",
          "The app language has been changed successfully.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("[LanguageProvider] Error changing language:", error);
    }
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      currentLanguage,
      changeLanguage,
      isRTL: i18nConfig.isRTL(currentLanguage),
      direction: i18nConfig.getDirection(currentLanguage),
      availableLanguages: i18nConfig.locales,
      isLoading,
      hasSelectedLanguage,
    }),
    [currentLanguage, isLoading, hasSelectedLanguage]
  );

  if (isLoading) {
    // Return a loading component or null while initializing
    return null;
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export default LanguageProvider;

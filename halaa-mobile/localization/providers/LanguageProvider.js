import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { I18nManager, Alert, Platform } from "react-native";
import { reloadAppAsync } from "expo";
import Constants from "expo-constants";
import { I18nextProvider } from "react-i18next";
import i18n, { i18nConfig } from "../config/i18nConfig";
import { languageStorage } from "../../utils/languageStorage";

const LanguageContext = createContext({});

const LANGUAGE_STORAGE_KEY = "@app_language";

/**
 * Detect whether we're in Expo Go (forceRTL is a no-op
 * there and triggers a benign warning). In a dev client / standalone
 * build, calling `I18nManager.forceRTL(true)` flips the layout for
 * Arabic. The change requires app reload to take effect on iOS.
 *
 * `Constants.appOwnership === "expo"` is the official Expo Constants
 * API; `Constants.executionEnvironment` is its newer cousin. We check
 * both for safety.
 */
const _isExpoGo = () => {
  try {
    if (Constants?.appOwnership === "expo") return true;
    // executionEnvironment values: "bare" | "standalone" | "storeClient"
    if (Constants?.executionEnvironment === "storeClient") return true;
    return false;
  } catch (_) {
    return false;
  }
};

/**
 * Apply RTL layout to match the chosen locale. Safe to call repeatedly:
 *   - if `I18nManager.isRTL` already matches, this is a no-op.
 *   - if it doesn't, we flip + request a reload (handled by the
 *     LanguageProvider via the alert).
 *
 * Returns `true` when a reload is needed, `false` otherwise.
 */
const applyRTLForLocale = (locale) => {
  const wantRTL = i18nConfig.isRTL(locale);
  try {
    I18nManager.allowRTL(wantRTL);
  } catch (_) {
    /* no-op on web */
  }
  if (I18nManager.isRTL === wantRTL) return false;
  if (_isExpoGo()) {
    // Expo Go ignores forceRTL — layout direction stays flexDirection-based.
    return false;
  }
  try {
    I18nManager.forceRTL(wantRTL);
  } catch (_) {
    /* unsupported on the current platform */
  }
  return Platform.OS === "ios" || Platform.OS === "android";
};

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
    let waitingForDirectionReload = false;
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

      // Opportunistically call I18nManager.forceRTL so dev-client /
      // production builds get native RTL layout. Expo Go ignores it
      // (the `_isExpoGo` guard avoids the warning). The
      // flexDirection-based RTL fallback in the context still applies
      // as a safety net.
      const shouldBeRTL = i18nConfig.isRTL(selectedLang);
      const reloadNeeded = applyRTLForLocale(selectedLang);
      console.log(
        "[LanguageProvider] Language initialized:",
        selectedLang,
        "| RTL:",
        shouldBeRTL,
        "| reloadNeeded:",
        reloadNeeded
      );

      // Native RTL state is persistent and is read before the React tree is
      // laid out. Never render the selected locale over the previous native
      // direction: reload the same bundle once so Android and iOS start with
      // one authoritative direction.
      if (reloadNeeded && !_isExpoGo() && Platform.OS !== "web") {
        waitingForDirectionReload = true;
        try {
          await reloadAppAsync("Apply saved Halaa language direction");
          return;
        } catch (reloadError) {
          waitingForDirectionReload = false;
          console.error(
            "[LanguageProvider] Saved-direction reload failed:",
            reloadError
          );
        }
      }
    } catch (error) {
      console.error("Error initializing language:", error);
      // Fallback to default locale
      setCurrentLanguage(i18nConfig.defaultLocale);
      await i18n.changeLanguage(i18nConfig.defaultLocale);
      setHasSelectedLanguage(false);
    } finally {
      if (!waitingForDirectionReload) setIsLoading(false);
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
        const reloadNeeded = applyRTLForLocale(languageCode);
        console.log(
          "[LanguageProvider] Language changed to:",
          languageCode,
          "| RTL:",
          shouldBeRTL,
          "| reloadNeeded:",
          reloadNeeded
        );

        const alertTitle = languageCode === "ar" ? "تم تغيير اللغة" : "Language Changed";
        const alertMessage =
          languageCode === "ar"
            ? reloadNeeded
              ? "تم تغيير لغة التطبيق. سيُعاد تشغيل التطبيق الآن لتطبيق اتجاه الواجهة بالكامل."
              : "تم تغيير لغة التطبيق بنجاح."
            : reloadNeeded
              ? "The app language has changed. The app will restart now to apply the layout direction."
              : "The app language has been changed successfully.";
        const buttonText = languageCode === "ar" ? "حسناً" : "OK";

        Alert.alert(
          alertTitle,
          alertMessage,
          [
            {
              text: buttonText,
              onPress:
                reloadNeeded && !_isExpoGo() && Platform.OS !== "web"
                  ? () => {
                      reloadAppAsync("Apply Halaa language direction").catch(
                        (reloadError) =>
                          console.error(
                            "[LanguageProvider] Direction reload failed:",
                            reloadError
                          )
                      );
                    }
                  : undefined,
            },
          ],
          { cancelable: !reloadNeeded }
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

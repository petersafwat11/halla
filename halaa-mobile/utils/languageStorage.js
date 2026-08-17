import AsyncStorage from "@react-native-async-storage/async-storage";

const LANGUAGE_STORAGE_KEY = "@app_language";
const LANGUAGE_SELECTED_KEY = "@language_selected";

export const languageStorage = {
  // Save the selected language
  async saveLanguage(languageCode) {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
      await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, "true");
      return true;
    } catch (error) {
      console.error("Error saving language:", error);
      return false;
    }
  },

  // Get the saved language
  async getLanguage() {
    try {
      const language = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      return language;
    } catch (error) {
      console.error("Error getting language:", error);
      return null;
    }
  },

  // Check if user has already selected a language
  async hasSelectedLanguage() {
    try {
      const selected = await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
      return selected === "true";
    } catch (error) {
      console.error("Error checking language selection:", error);
      return false;
    }
  },

  // Clear language selection (for testing or reset)
  async clearLanguageSelection() {
    try {
      await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY);
      await AsyncStorage.removeItem(LANGUAGE_SELECTED_KEY);
      return true;
    } catch (error) {
      console.error("Error clearing language selection:", error);
      return false;
    }
  },
};

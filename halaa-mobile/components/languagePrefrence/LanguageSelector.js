import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LanguageReset from "./LanguageReset";
import DirectionalIonicon from "../common/DirectionalIonicon";

const LanguageSelector = ({ onLanguageSelect }) => {
  const languages = [
    {
      code: "ar",
      name: "العربية",
      flag: "🇸🇦",
      direction: "rtl",
    },
    {
      code: "en",
      name: "English",
      flag: "🇺🇸",
      direction: "ltr",
    },
  ];

  const handleLanguageSelect = (languageCode) => {
    onLanguageSelect(languageCode);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <LanguageReset />
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>اختر لغتك المفضلة</Text>
            <Text style={styles.titleEn}>Choose Your Language</Text>
            <Text style={styles.subtitle}>
              يمكنك تغيير اللغة لاحقاً من الإعدادات
            </Text>
            <Text style={styles.subtitleEn}>
              You can change the language later in settings
            </Text>
          </View>

          {/* Language Options */}
          <View style={styles.languageContainer}>
            {languages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={styles.languageOption}
                onPress={() => handleLanguageSelect(language.code)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={language.name}
              >
                <View style={styles.languageContent}>
                  <Text style={styles.flag}>{language.flag}</Text>
                  <View style={styles.languageText}>
                    <Text
                      style={[
                        styles.languageName,
                        { writingDirection: language.direction },
                      ]}
                    >
                      {language.name}
                    </Text>
                  </View>
                  <View style={styles.arrow}>
                    <DirectionalIonicon
                      name="arrow-forward"
                      size={18}
                      color="#fff"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    textAlign: "center",
    marginBottom: 8,
  },
  titleEn: {
    fontSize: 24,
    fontFamily: "Cairo_600SemiBold",
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  subtitleEn: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#999",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 20,
  },
  languageContainer: {
    width: "100%",
    gap: 16,
  },
  languageOption: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  languageContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flag: {
    fontSize: 32,
    marginEnd: 16,
  },
  languageText: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  languageName: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
  },
  arrow: {
    width: 44,
    height: 44,
    backgroundColor: "#c28e5c",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default LanguageSelector;

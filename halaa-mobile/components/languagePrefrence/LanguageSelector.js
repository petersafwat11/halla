import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import LanguageReset from "./LanguageReset";

const { width, height } = Dimensions.get("window");

const LanguageSelector = ({ onLanguageSelect }) => {
  const languages = [
    {
      code: "ar",
      name: "العربية",
      subtitle: "اللغة العربية",
      flag: "🇸🇦", // Saudi Arabia flag emoji
    },
    {
      code: "en",
      name: "English",
      subtitle: "English Language",
      flag: "🇺🇸", // US flag emoji
    },
  ];

  const handleLanguageSelect = (languageCode) => {
    onLanguageSelect(languageCode);
  };

  return (
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
            >
              <View style={styles.languageContent}>
                <Text style={styles.flag}>{language.flag}</Text>
                <View style={styles.languageText}>
                  <Text style={styles.languageName}>{language.name}</Text>
                  <Text style={styles.languageSubtitle}>
                    {language.subtitle}
                  </Text>
                </View>
                <View style={styles.arrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        {/* <View style={styles.footer}>
          <Text style={styles.footerText}>
            🌍 دعم كامل للغة العربية والإنجليزية
          </Text>
          <Text style={styles.footerTextEn}>
            🌍 Full support for Arabic and English
          </Text>
        </View> */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  languageContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageText: {
    flex: 1,
    alignItems: "flex-start",
  },
  languageName: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 4,
  },
  languageSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#666",
  },
  arrow: {
    width: 40,
    height: 40,
    backgroundColor: "#c28e5c",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Cairo_600SemiBold",
  },
  footer: {
    alignItems: "center",
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    width: "100%",
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#c28e5c",
    textAlign: "center",
    lineHeight: 20,
  },
  footerTextEn: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#999",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});

export default LanguageSelector;

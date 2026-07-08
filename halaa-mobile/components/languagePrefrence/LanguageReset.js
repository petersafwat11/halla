import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { languageStorage } from "../../utils/languageStorage";

// Development component to reset language selection
// Remove this in production
const LanguageReset = ({ onReset }) => {
  const handleReset = async () => {
    await languageStorage.clearLanguageSelection();
    if (onReset) {
      onReset();
    }
    console.log("Language selection reset - app will restart");
  };

  // Only show in development
  if (!__DEV__) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
      <Text style={styles.resetText}>🔄 Reset Language (Dev Only)</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  resetButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#ff4444",
    padding: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  resetText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
  },
});

export default LanguageReset;

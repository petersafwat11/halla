import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";

export default function TemplateCategoryChips({
  categories,
  selectedCategory,
  onSelect,
  locale,
  allLabel,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={[
          styles.button,
          selectedCategory === null && styles.buttonActive,
        ]}
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.text,
            selectedCategory === null && styles.textActive,
          ]}
        >
          {allLabel}
        </Text>
      </TouchableOpacity>

      {categories.map((cat) => {
        const label =
          locale === "ar"
            ? cat.nameAr || cat.nameEn
            : cat.nameEn || cat.nameAr;
        const code = cat.code;
        const isActive = selectedCategory === code;
        return (
          <TouchableOpacity
            key={cat._id || code}
            style={[styles.button, isActive && styles.buttonActive]}
            onPress={() => onSelect(code)}
            activeOpacity={0.7}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  content: {
    paddingEnd: 0,
    gap: 8,
    flexDirection: "row",
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  buttonActive: {
    backgroundColor: "#C28E5C",
  },
  text: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 20,
    letterSpacing: 0.014,
  },
  textActive: {
    color: "#FFF",
  },
});

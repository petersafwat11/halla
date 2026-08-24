import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import LocalizedText from "../../commen/LocalizedText";
import { PREDEFINED_TAGS } from "../../../utils/schemas/vendorServiceSchema";

const TagsSelector = ({ selectedTags, onTagPress }) => {
  const { t } = useTranslation("vendor");

  const localizedTags = useMemo(
    () =>
      PREDEFINED_TAGS.map((tag) => ({
        ...tag,
        label: t(`services.tags.${tag.value}`, tag.label),
      })),
    [t],
  );

  return (
    <View style={styles.tagsSection}>
      <LocalizedText role="label" style={styles.tagsLabel}>
        {t("services.tagsLabel")}
      </LocalizedText>
      <View style={styles.tagsContainer}>
        {localizedTags.map((tag) => (
          <TouchableOpacity
            key={tag.value}
            style={[
              styles.tag,
              selectedTags.includes(tag.value) && styles.tagSelected,
            ]}
            onPress={() => onTagPress(tag)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selectedTags.includes(tag.value) }}
          >
            <LocalizedText
              role="label"
              style={[
                styles.tagText,
                selectedTags.includes(tag.value) && styles.tagTextSelected,
              ]}
            >
              {tag.label}
            </LocalizedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tagsSection: {
    marginBottom: 16,
  },
  tagsLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#F2F2F2",
  },
  tagSelected: {
    backgroundColor: "#F5ECE4",
    borderColor: "#C28E5C",
  },
  tagText: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
  },
  tagTextSelected: {
    color: "#C28E5C",
    fontFamily: "Cairo_600SemiBold",
  },
});

export default TagsSelector;

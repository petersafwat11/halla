import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CategoryPickerSheet from "./CategoryPickerSheet";

/**
 * Creatable category picker field — the mobile counterpart of web's
 * CategorySelect. A trigger button shows the current value (or placeholder)
 * with a trailing chevron, and opens the shared CategoryPickerSheet. Controlled
 * via value/onChange (plain string), so it drops into local state or RHF alike.
 */
const CategorySelect = ({
  value = "",
  onChange,
  options = [],
  label,
  placeholder = "اختر أو أنشئ تصنيفاً",
  searchPlaceholder = "ابحث أو اكتب تصنيفاً",
  noneLabel = "بدون تصنيف",
  createLabel = (q) => `إنشاء «${q}»`,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.triggerText, !value && styles.placeholderText]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#656565" />
      </TouchableOpacity>

      <CategoryPickerSheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={(val) => onChange?.(val)}
        value={value}
        options={options}
        searchPlaceholder={searchPlaceholder}
        noneLabel={noneLabel}
        createLabel={createLabel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%" },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  triggerDisabled: { backgroundColor: "#F5F5F5", opacity: 0.6 },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
  },
  placeholderText: { color: "#999" },
});

export default CategorySelect;

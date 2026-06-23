import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#C28E5C",
  textDark: "#2C2C2C",
  textMuted: "#656565",
  disabled: "#B0B0B0",
  border: "#DFDFDF",
  bgLight: "#FFF",
  bgActive: "#FBF5EF",
  borderLight: "#F2F2F2",
};

export const FilterDropdown = ({ value, options, onSelect, placeholder, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;
  const isPlaceholder = !options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownTrigger, disabled && styles.dropdownDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-down" size={18} color={disabled ? COLORS.disabled : COLORS.textMuted} />
        <Text
          style={[styles.dropdownText, isPlaceholder && styles.dropdownPlaceholder]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.dropdownModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownModalHeader}>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
              <Text style={styles.dropdownModalTitle}>{placeholder}</Text>
              <View style={{ width: 22 }} />
            </View>
            <FlatList
              data={options}
              keyExtractor={(item, i) => String(item.value ?? i)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownOption, value === item.value && styles.dropdownOptionActive]}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownOptionText, value === item.value && styles.dropdownOptionTextActive]}>
                    {item.label}
                  </Text>
                  {value === item.value && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.dropdownOptionsList}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 50,
    gap: 10,
  },
  dropdownDisabled: {
    backgroundColor: "#F5F5F5",
    opacity: 0.6,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: COLORS.textDark,
    lineHeight: 22,
  },
  dropdownPlaceholder: {
    color: "#9CA3AF",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  dropdownModal: {
    backgroundColor: COLORS.bgLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  dropdownModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dropdownModalTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: COLORS.textDark,
  },
  dropdownOptionsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dropdownOptionActive: {
    backgroundColor: COLORS.bgActive,
    borderRadius: 10,
    borderBottomColor: "transparent",
  },
  dropdownOptionText: {
    fontSize: 15,
    fontFamily: "Cairo_500Medium",
    color: COLORS.textDark,
    lineHeight: 24,
  },
  dropdownOptionTextActive: {
    color: COLORS.primary,
    fontFamily: "Cairo_600SemiBold",
  },
});

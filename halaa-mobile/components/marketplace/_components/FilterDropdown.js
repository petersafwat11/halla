import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LocalizedText from "../../commen/LocalizedText";
import AdaptiveText from "../../commen/AdaptiveText";

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
      {/* Trigger anatomy mirrors the shared DropdownInput field contract:
          selected/placeholder value at the logical start, trailing chevron
          affordance at the logical end. The down chevron is a vertical
          affordance — it is never mirrored. */}
      <TouchableOpacity
        style={[styles.dropdownTrigger, disabled && styles.dropdownDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {isPlaceholder ? (
          <LocalizedText numberOfLines={1} style={[styles.dropdownText, styles.dropdownPlaceholder]}>
            {selectedLabel}
          </LocalizedText>
        ) : (
          // Selected region/city names are backend content → adaptive.
          <AdaptiveText numberOfLines={1} style={styles.dropdownText}>
            {selectedLabel}
          </AdaptiveText>
        )}
        <Ionicons name="chevron-down" size={18} color={disabled ? COLORS.disabled : COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.dropdownModal} onPress={(e) => e.stopPropagation()}>
            {/* Sheet header: localized title at the reading start, close at
                the logical end. */}
            <View style={styles.dropdownModalHeader}>
              <LocalizedText style={styles.dropdownModalTitle} numberOfLines={1}>
                {placeholder}
              </LocalizedText>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={{ top: 10, bottom: 10, start: 10, end: 10 }}
                accessibilityRole="button"
                accessibilityLabel={placeholder}
              >
                <Ionicons name="close" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item, i) => String(item.value ?? i)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownOption, value === item.value && styles.dropdownOptionActive]}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: value === item.value }}
                >
                  <AdaptiveText
                    numberOfLines={1}
                    style={[
                      styles.dropdownOptionText,
                      value === item.value && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {item.label}
                  </AdaptiveText>
                  {/* Checkmark is a semantic selection glyph at the logical
                      end; it is never mirrored. */}
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
    flex: 1,
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: COLORS.textDark,
    marginEnd: 12,
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
    flexShrink: 1,
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

import React from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import TextInput from "../../commen/DirectionalTextInput";
import AdaptiveText from "../../commen/AdaptiveText";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#C28E5C",
  textDark: "#2C2C2C",
  border: "#DFDFDF",
  bgLight: "#FFF",
};

export const DistrictCheckboxes = ({ districts, selectedIds, onToggle, loading }) => {
  if (loading) {
    return <ActivityIndicator size="small" color={COLORS.primary} />;
  }
  return (
    <View style={checkboxGroup}>
      {districts.map((district) => (
        <TouchableOpacity
          key={district.district_id}
          style={checkboxItem}
          onPress={() => onToggle(district.district_id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selectedIds?.includes(district.district_id) }}
        >
          {/* Leading selection box; the checkmark inside is semantic and is
              never mirrored. */}
          <View
            style={[
              checkbox,
              selectedIds?.includes(district.district_id) && checkboxActive,
            ]}
          >
            {selectedIds?.includes(district.district_id) && (
              <Ionicons name="checkmark" size={16} color="#FFF" />
            )}
          </View>
          {/* District names are backend content → adaptive direction. */}
          <AdaptiveText style={checkboxLabel}>
            {district.displayName ?? district.name_ar}
          </AdaptiveText>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const PriceRangeInputs = ({ minPrice, maxPrice, onChange, t }) => (
  <View style={priceRangeContainer}>
    {/* Amount entry uses the shared digit-entry contract (phone mode):
        localized empty placeholder at the locale start edge, stable LTR
        digits/cursor once a value is typed. */}
    <TextInput
      style={priceInput}
      contentDirection="phone"
      placeholder={t("filters.minPrice")}
      keyboardType="numeric"
      value={minPrice}
      onChangeText={(value) => onChange("minPrice", value)}
    />
    <AdaptiveText style={priceSeparator}>-</AdaptiveText>
    <TextInput
      style={priceInput}
      contentDirection="phone"
      placeholder={t("filters.maxPrice")}
      keyboardType="numeric"
      value={maxPrice}
      onChangeText={(value) => onChange("maxPrice", value)}
    />
  </View>
);

const checkboxGroup = { gap: 12 };
const checkboxItem = { flexDirection: "row", alignItems: "center", gap: 12 };
const checkbox = {
  width: 24,
  height: 24,
  borderRadius: 6,
  borderWidth: 2,
  borderColor: "#E5E5E5",
  justifyContent: "center",
  alignItems: "center",
};
const checkboxActive = { backgroundColor: COLORS.primary, borderColor: COLORS.primary };
const checkboxLabel = {
  flexShrink: 1,
  fontSize: 14,
  fontFamily: "Cairo_500Medium",
  color: COLORS.textDark,
};
const priceRangeContainer = { flexDirection: "row", alignItems: "center", gap: 8 };
const priceSeparator = { fontSize: 16, color: COLORS.textDark };
const priceInput = {
  flex: 1,
  backgroundColor: COLORS.bgLight,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: COLORS.border,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14,
  fontFamily: "Cairo_400Regular",
};

import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius } from "../../../styles/tokens";

/**
 * AdminCheckbox - Reusable checkbox for admin list item selection.
 * Props:
 *   checked  {bool}   - Is checkbox checked
 *   onPress  {func}   - Called when pressed
 *   style    {object} - Extra container style
 *   size     {number} - Box size in dp (default 22)
 */
const AdminCheckbox = ({ checked = false, onPress, style, size = 22 }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.wrapper, style]}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: Math.floor(size / 5) },
        checked && styles.checked,
      ]}
    >
      {checked && (
        <Ionicons name="checkmark" size={Math.floor(size * 0.65)} color="#fff" />
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrapper: { justifyContent: "center", alignItems: "center" },
  box: {
    borderWidth: 2,
    borderColor: colors.natural[300],
    backgroundColor: colors.natural[50],
    justifyContent: "center",
    alignItems: "center",
  },
  checked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
});

export default AdminCheckbox;

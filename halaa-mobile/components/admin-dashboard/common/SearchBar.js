import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import TextInput from "../../commen/DirectionalTextInput";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useInputDirection } from "../../../hooks/useInputDirection";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../styles/tokens";

/**
 * SearchBar - Search input with clear button
 *
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChangeText - Text change handler (debounced)
 * @param {string} props.placeholder - Placeholder text
 * @param {Function} props.onClear - Clear button handler
 */
const SearchBar = ({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
}) => {
  const [localValue, setLocalValue] = useState(value || "");
  // Explicit localized direction for the iOS search placeholder.
  const searchDirectionStyle = useInputDirection("localized");

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  useEffect(() => {
    // Debounce the search input
    const timer = setTimeout(() => {
      if (onChangeText) {
        onChangeText(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChangeText]);

  const handleClear = () => {
    setLocalValue("");
    if (onClear) {
      onClear();
    }
    if (onChangeText) {
      onChangeText("");
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons
        name="search"
        size={20}
        color={colors.natural[450]}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.input, searchDirectionStyle]}
        value={localValue}
        onChangeText={setLocalValue}
        placeholder={placeholder}
        placeholderTextColor={colors.natural[450]}
      />
      {localValue.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color={colors.natural[450]} />
        </TouchableOpacity>
      )}
    </View>
  );
};

SearchBar.propTypes = {
  value: PropTypes.string,
  onChangeText: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  onClear: PropTypes.func,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[8],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderWidth: 1,
    borderColor: colors.natural[200],
  },
  searchIcon: {
    marginEnd: spacing[8],
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    padding: 0,
  },
  clearButton: {
    marginStart: spacing[8],
    padding: spacing[4],
  },
});

export default SearchBar;

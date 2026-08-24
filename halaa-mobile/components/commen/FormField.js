import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { CONTENT_DIRECTIONS, useFieldDirection } from "../../hooks/useInputDirection";
import DirectionalTextInput from "./DirectionalTextInput";
import LocalizedText from "./LocalizedText";
import AdaptiveText from "./AdaptiveText";

/**
 * Shared field shell for non-react-hook-form fields (blueprint §5.2).
 *
 * Every local form must render its fields through this shell so a page
 * cannot omit label/error direction again — the Step 2 regression behind
 * screenshot 6. Exposed slots, in logical order:
 *   1. localized label (`LocalizedText` contract, always UI-locale);
 *   2. optional leading semantic icon;
 *   3. value/placeholder using the declared content mode ("adaptive" by
 *      default: empty placeholder follows the locale, filled value follows
 *      its first strong character so "Ali" stays LTR and Arabic names RTL);
 *   4. optional trailing affordance slot (chevron/eye/clear) — JSX order is
 *      logical order, so the affordance stays at the reading end in both
 *      locales without any physical styling;
 *   5. localized error or helper;
 *   6. LTR-isolated counter at the logical end.
 *
 * Focus, error, disabled and read-only states only change border/background
 * colours, never geometry.
 *
 * Pass `onPress` instead of `onChangeText` to render a picker trigger
 * (dropdown-style field); the selected value is then rendered adaptively
 * with first-strong isolation like DropdownInput.
 *
 * Pass `multiline` (+ optional `numberOfLines`) for free-text areas such as
 * business descriptions; the value keeps the declared content mode and the
 * LTR-isolated counter stays at the logical end.
 */
const FormField = ({
  label,
  value,
  placeholder,
  onChangeText,
  contentDirection = CONTENT_DIRECTIONS.ADAPTIVE,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  maxLength,
  editable = true,
  disabled = false,
  icon,
  trailing,
  onPress,
  inputRef,
  onSubmitEditing,
  returnKeyType,
  autoFocus = false,
  multiline = false,
  numberOfLines,
  error,
  helper,
  showCounter = false,
  inputStyle,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = String(value ?? "").length > 0;
  const fieldDirection = useFieldDirection(contentDirection, { hasValue, value });
  const isDisabled = disabled || !editable;
  // Picker triggers open through `onPress`; editable boxes make the whole
  // box (padding included) focus the input, matching the shared TextInput.
  const handlePress =
    onPress || (() => !isDisabled && inputRef?.current?.focus());

  const boxStateStyle = [
    styles.box,
    isFocused && styles.boxFocused,
    error && styles.boxError,
    isDisabled && styles.boxDisabled,
  ];

  return (
    <View style={styles.container}>
      {!!label && (
        <LocalizedText role="label" style={[styles.label, fieldDirection.text]}>
          {label}
        </LocalizedText>
      )}

      <Pressable
        style={[boxStateStyle, multiline && styles.boxMultiline]}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityState={{ disabled: isDisabled }}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}

        {onPress ? (
          value ? (
            <AdaptiveText numberOfLines={1} style={[styles.value, inputStyle]}>
              {value}
            </AdaptiveText>
          ) : (
            <LocalizedText numberOfLines={1} style={[styles.value, styles.placeholder, inputStyle]}>
              {placeholder}
            </LocalizedText>
          )
        ) : (
          <DirectionalTextInput
            ref={inputRef}
            style={[
              styles.value,
              styles.input,
              multiline && styles.inputMultiline,
              inputStyle,
            ]}
            contentDirection={contentDirection}
            placeholder={placeholder}
            placeholderTextColor="#999"
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            maxLength={maxLength}
            editable={!isDisabled}
            onSubmitEditing={onSubmitEditing}
            returnKeyType={returnKeyType}
            autoFocus={autoFocus}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={multiline ? "top" : undefined}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        )}

        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </Pressable>

      {error ? (
        <LocalizedText role="error" style={[styles.meta, styles.errorText, fieldDirection.text]}>
          {error}
        </LocalizedText>
      ) : helper ? (
        <LocalizedText role="hint" style={[styles.meta, styles.helperText, fieldDirection.text]}>
          {helper}
        </LocalizedText>
      ) : null}

      {showCounter && maxLength ? (
        <Text style={[styles.meta, styles.counterText, fieldDirection.counter]}>
          {isolateLtr(`${String(value ?? "").length} / ${maxLength}`)}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    marginBottom: 8,
    width: "100%",
  },
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    width: "100%",
    gap: 8,
  },
  boxFocused: {
    borderColor: "#c28e5c",
    borderWidth: 2,
  },
  boxError: {
    borderColor: "#e74c3c",
  },
  boxDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E0E0E0",
  },
  boxMultiline: {
    alignItems: "stretch",
  },
  icon: {
    marginEnd: 4,
  },
  trailing: {
    marginStart: 4,
  },
  value: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
  },
  input: {
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  placeholder: {
    color: "#999",
  },
  meta: {
    marginTop: 4,
  },
  errorText: {
    width: "100%",
  },
  helperText: {
    width: "100%",
  },
  counterText: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#767676",
    width: "100%",
  },
});

export default FormField;

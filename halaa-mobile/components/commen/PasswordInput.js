import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "../../localization";
import { useFieldDirection } from "../../hooks/useInputDirection";

// Above this system font scale a one-line helper would shrink below a
// readable size or ellipsize, so it wraps instead.
const MAX_SINGLE_LINE_FONT_SCALE = 1.15;

/**
 * Hoisted field renderer to satisfy Rules-of-Hooks and stabilize focus state.
 */
const PasswordInputField = ({
  label,
  placeholder,
  disabled,
  value,
  error,
  helper,
  helperNumberOfLines,
  onChange,
  onBlur,
  fieldRef,
  extraProps,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const inputRef = useRef(null);
  const { t } = useTranslation("common");
  const { fontScale } = useWindowDimensions();
  const helperLines =
    helperNumberOfLines === 1 && fontScale > MAX_SINGLE_LINE_FONT_SCALE
      ? undefined
      : helperNumberOfLines;
  // Alignment mirrors the plain TextInput: placeholder/chrome follow the UI
  // locale and stay put while typing. The previous forced-LTR policy made iOS
  // render the Arabic placeholder right-aligned, then snap the masked dots
  // left as soon as the user started typing (base-direction mismatch).
  const fieldDirection = useFieldDirection("localized", { hasValue: !!value });

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, fieldDirection.text]}>{label}</Text>}
      <Pressable
        onPress={() => !disabled && inputRef.current?.focus()}
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#999"
          style={styles.icon}
        />
        <RNTextInput
          {...extraProps}
          ref={(node) => {
            inputRef.current = node;
            fieldRef?.(node);
          }}
          style={[styles.input, fieldDirection.input]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value || ""}
          onChangeText={onChange}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onFocus={() => setIsFocused(true)}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          editable={!disabled}
          textAlign={fieldDirection.input.writingDirection === "rtl" ? "right" : "left"}
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setIsSecure(!isSecure)}
          style={styles.eyeButton}
          accessibilityRole="button"
          accessibilityLabel={
            isSecure
              ? t("showPassword", { defaultValue: "Show password" })
              : t("hidePassword", { defaultValue: "Hide password" })
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isSecure ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#999"
          />
        </TouchableOpacity>
      </Pressable>
      {error && (
        <Text style={[styles.errorText, fieldDirection.text]}>{error.message}</Text>
      )}
      {!error && helper ? (
        <Text
          style={[styles.helperText, fieldDirection.text]}
          numberOfLines={helperLines}
          adjustsFontSizeToFit={helperLines === 1}
          minimumFontScale={0.85}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
};

const PasswordInput = ({
  name,
  label,
  placeholder,
  disabled = false,
  helper,
  helperNumberOfLines,
  rules,
  ...props
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({
        field: { onChange, onBlur, value, ref },
        fieldState: { error },
      }) => (
        <PasswordInputField
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          error={error}
          helper={helper}
          helperNumberOfLines={helperNumberOfLines}
          onChange={onChange}
          onBlur={onBlur}
          fieldRef={ref}
          extraProps={props}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    direction: "ltr",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    width: "100%",
  },
  inputContainerFocused: {
    borderColor: "#c28e5c",
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: "#e74c3c",
  },
  inputContainerDisabled: {
    backgroundColor: "#f5f5f5",
    opacity: 0.6,
  },
  icon: {
    marginEnd: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    paddingVertical: 12,
  },
  eyeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#767676",
    marginTop: 4,
  },
});

export default PasswordInput;

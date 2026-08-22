import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "../../localization";
import { useFieldDirection } from "../../hooks/useInputDirection";

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
  onChange,
  onBlur,
  extraProps,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const inputRef = useRef(null);
  const { t } = useTranslation("common");
  // Password value is LTR; field chrome still follows the selected locale.
  const fieldDirection = useFieldDirection("ltr", { hasValue: !!value });

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
          ref={inputRef}
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
        <Text style={[styles.helperText, fieldDirection.text]}>{helper}</Text>
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
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <PasswordInputField
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          error={error}
          helper={helper}
          onChange={onChange}
          onBlur={onBlur}
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
    marginEnd: 4,
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

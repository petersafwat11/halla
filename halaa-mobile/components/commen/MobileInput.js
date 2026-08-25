import React, { useState } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFormContext, Controller } from "react-hook-form";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import {
  clampPhoneInput,
  getPhoneMaxLength,
  DEFAULT_PHONE_PLACEHOLDER,
} from "@halaa/shared/utils/phone";
import { useFieldDirection } from "../../hooks/useInputDirection";
import { useTranslation } from "../../localization";

/**
 * Hoisted field renderer to satisfy Rules-of-Hooks and stabilize focus state.
 */
export const MobileInputField = ({
  label,
  placeholder,
  disabled,
  countryCode = "+966",
  value,
  error,
  helper,
  onChange,
  onBlur,
  extraProps,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef(null);
  const { isRTL } = useTranslation();

  const hasValue = !!value && String(value).length > 0;
  // "phone": localized (RTL) placeholder while empty, LTR digits once non-empty
  const fieldDirection = useFieldDirection("phone", { hasValue });
  const resolvedPlaceholder = placeholder || DEFAULT_PHONE_PLACEHOLDER;

  // Phone digits are intrinsically LTR: keep the chrome (icon + country-code
  // prefix) on the visual left in both locales. RTL rows mirror child order,
  // so declare the children reversed there — never via flexDirection hacks.
  const iconEl = (
    <Ionicons
      name="call-outline"
      size={20}
      color="#999"
      style={[styles.icon, isRTL ? styles.iconRtl : null]}
    />
  );
  const prefixEl = (
    <View style={[styles.countryCode, isRTL ? styles.countryCodeRtl : null]}>
      <Text style={styles.countryCodeText}>{isolateLtr(countryCode)}</Text>
    </View>
  );
  const inputEl = (
    <RNTextInput
      {...extraProps}
      ref={inputRef}
      style={[styles.input, fieldDirection.input]}
      placeholder={resolvedPlaceholder}
      placeholderTextColor="#999"
      value={value || ""}
      maxLength={getPhoneMaxLength(value)}
      onChangeText={(text) => onChange?.(clampPhoneInput(text))}
      onBlur={() => {
        setIsFocused(false);
        onBlur?.();
      }}
      onFocus={() => setIsFocused(true)}
      keyboardType="phone-pad"
      editable={!disabled}
    />
  );

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
        {isRTL ? [inputEl, prefixEl, iconEl] : [iconEl, prefixEl, inputEl]}
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

const MobileInput = ({
  name,
  label,
  placeholder,
  disabled = false,
  countryCode = "+966",
  helper,
  rules,
  ...props
}) => {
  const formContext = useFormContext();

  if (!formContext) {
    return (
      <MobileInputField
        label={label}
        placeholder={placeholder}
        disabled={disabled}
        countryCode={countryCode}
        value={props.value}
        error={props.error}
        helper={helper}
        onChange={props.onChangeText || props.onChange}
        onBlur={props.onBlur}
        extraProps={props}
      />
    );
  }

  const { control } = formContext;

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <MobileInputField
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          countryCode={countryCode}
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
    // Chrome order (icon + prefix vs input) is swapped in JSX for RTL, and the
    // icon/prefix styles carry logical LTR/RTL variants so the divider always
    // sits between the prefix and the digits in both locales.
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
  // RTL variant for the swapped chrome order: the divider and gaps must sit
  // between the prefix and the digits, which is the logical START side once
  // the row is mirrored. Logical props only — no physical left/right styles.
  iconRtl: {
    marginEnd: 0,
    marginStart: 4,
  },
  countryCode: {
    paddingEnd: 12,
    marginEnd: 4,
    borderEndWidth: 1,
    borderEndColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  countryCodeRtl: {
    paddingEnd: 0,
    marginEnd: 0,
    borderEndWidth: 0,
    paddingStart: 12,
    marginStart: 4,
    borderStartWidth: 1,
    borderStartColor: "#e0e0e0",
  },
  countryCodeText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    writingDirection: "ltr",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    paddingVertical: 12,
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

export default MobileInput;

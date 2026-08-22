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
import { useFieldDirection } from "../../hooks/useInputDirection";

/**
 * Hoisted field renderer to satisfy Rules-of-Hooks and stabilize focus state.
 */
const MobileInputField = ({
  label,
  placeholder,
  disabled,
  countryCode,
  value,
  error,
  helper,
  onChange,
  onBlur,
  extraProps,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef(null);

  const hasValue = !!value && String(value).length > 0;
  // "phone": localized (RTL) placeholder while empty, LTR digits once non-empty
  const fieldDirection = useFieldDirection("phone", { hasValue });

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
          name="call-outline"
          size={20}
          color="#999"
          style={styles.icon}
        />
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>{isolateLtr(countryCode)}</Text>
        </View>
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
          keyboardType="phone-pad"
          editable={!disabled}
        />
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
  countryCode: {
    paddingEnd: 12,
    marginEnd: 4,
    borderEndWidth: 1,
    borderEndColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
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

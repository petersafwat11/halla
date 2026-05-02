import React from "react";
import { View, Text, TextInput as RNTextInput, StyleSheet } from "react-native";
import { useFormContext, Controller } from "react-hook-form";

const TextAreaInput = ({
  name,
  label,
  placeholder,
  autoCapitalize = "sentences",
  editable = true,
  disabled = false,
  numberOfLines = 3,
  maxLength,
  rules,
  ...props
}) => {
  const { control } = useFormContext();
  const isDisabled = disabled || !editable;

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error }
      }) => {
        const [isFocused, setIsFocused] = React.useState(false);
        const formValue = value || "";

        return (
          <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
              style={[
                styles.inputContainer,
                isFocused && styles.inputContainerFocused,
                error && styles.inputContainerError,
                isDisabled && styles.inputContainerDisabled,
              ]}
            >
              <RNTextInput
                style={styles.textArea}
                placeholder={placeholder}
                placeholderTextColor="#999"
                value={formValue}
                onChangeText={onChange}
                onBlur={() => {
                  setIsFocused(false);
                  onBlur();
                }}
                onFocus={() => setIsFocused(true)}
                autoCapitalize={autoCapitalize}
                editable={!isDisabled}
                multiline={true}
                numberOfLines={numberOfLines}
                textAlign="auto"
                textAlignVertical="top"
                maxLength={maxLength}
                {...props}
              />
            </View>
            {error && <Text style={styles.errorText}>{error.message}</Text>}
            {maxLength && (
              <Text style={styles.charCount}>
                {formValue?.length || 0} / {maxLength}
              </Text>
            )}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%"
  },  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
    textAlign: "left",
    width: "100%"
  },  inputContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%"
  },  inputContainerFocused: {
    borderColor: "#c28e5c",
    borderWidth: 2
  },
  inputContainerError: {
    borderColor: "#e74c3c"
  },
  inputContainerDisabled: {
    backgroundColor: "#f5f5f5"
  },
  textArea: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    minHeight: 80,
    textAlignVertical: "top"
  },  charCount: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#999",
    marginTop: 4,
    textAlign: "right"
  },  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
    textAlign: "left"
  },});

export default TextAreaInput;

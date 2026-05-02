import React from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  Animated,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";

const TextInput = ({
  name,
  label,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  icon,
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
        fieldState: { error },
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
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <RNTextInput
                style={[styles.input, multiline && styles.inputMultiline]}
                placeholder={placeholder}
                placeholderTextColor="#999"
                value={formValue}
                onChangeText={onChange}
                onBlur={() => {
                  setIsFocused(false);
                  onBlur();
                }}
                onFocus={() => setIsFocused(true)}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                editable={!isDisabled}
                multiline={multiline}
                numberOfLines={numberOfLines}
                textAlign="auto"
                {...props}
              />
            </View>
            {error && <Text style={styles.errorText}>{error.message}</Text>}
          </View>
        );
      }}
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
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  iconContainer: {
    marginRight: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
});

export default TextInput;

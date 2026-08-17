import React, { useState } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useFormContext } from "react-hook-form";

const PasswordInput = ({
  name,
  label,
  placeholder,
  disabled = false,
  rules,
  ...props
}) => {
  const { control } = useFormContext();
  const [isSecure, setIsSecure] = useState(true);

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error }
      }) => {
        const [isFocused, setIsFocused] = useState(false);

        return (
          <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
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
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#999"
                value={value || ""}
                onChangeText={onChange}
                onBlur={() => {
                  setIsFocused(false);
                  onBlur();
                }}
                onFocus={() => setIsFocused(true)}
                secureTextEntry={isSecure}
                autoCapitalize="none"
                editable={!disabled}
                {...props}
              />
              <TouchableOpacity
                onPress={() => setIsSecure(!isSecure)}
                style={[styles.eyeIcon]}
              >
                <Ionicons
                  name={isSecure ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            {error && (
              <Text style={[styles.errorText]}>
                {error.message}
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
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    width: "100%"
  },  inputContainerFocused: {
    borderColor: "#c28e5c",
    borderWidth: 2
  },
  inputContainerError: {
    borderColor: "#e74c3c"
  },
  inputContainerDisabled: {
    backgroundColor: "#f5f5f5",
    opacity: 0.6
  },
  icon: {
    marginRight: 8
  },  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    paddingVertical: 12
  },  eyeIcon: {
    padding: 4,
    marginLeft: 8
  },  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
    textAlign: "left"
  },});

export default PasswordInput;

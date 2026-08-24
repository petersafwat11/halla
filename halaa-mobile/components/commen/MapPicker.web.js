import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { Ionicons } from "@expo/vector-icons";
import { isolateAuto } from "@halaa/shared/utils/bidi";
import { useFieldDirection } from "../../hooks/useInputDirection";

/**
 * Web stub for MapPicker — react-native-maps is not supported on web.
 * Shows a disabled placeholder instead.
 */
const MapPickerInner = ({
  label,
  placeholder,
  error,
  disabled,
  contentDirection = "localized",
}) => {
  const fieldDirection = useFieldDirection(contentDirection);
  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, fieldDirection.text]}>{label}</Text>}
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          styles.inputContainerDisabled,
        ]}
        disabled
        activeOpacity={1}
      >
        <View style={styles.inputContent}>
          <Ionicons name="location-outline" size={24} color="#C28E5C" />
          <Text style={[styles.placeholderText, fieldDirection.input]}>
            {isolateAuto(placeholder || "Map not available on web")}
          </Text>
        </View>
      </TouchableOpacity>
      {error && (
        <Text style={[styles.errorText, fieldDirection.text]}>{error.message}</Text>
      )}
    </View>
  );
};

const MapPicker = ({
  name,
  label,
  placeholder = "Map not available on web",
  disabled = false,
  rules,
  contentDirection = "localized",
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <MapPickerInner
          onChange={onChange}
          value={value}
          error={error}
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          contentDirection={contentDirection}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: "100%" },
  label: { fontSize: 14, fontWeight: "600", color: "#2C2C2C", marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  inputContent: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  inputContainerError: { borderColor: "#E74C3C", borderWidth: 1.5 },
  inputContainerDisabled: { backgroundColor: "#F5F5F5", opacity: 0.6 },
  placeholderText: { flex: 1, fontSize: 15, color: "#999" },
  errorText: { fontSize: 12, color: "#E74C3C", marginTop: 6 },
});

export default MapPicker;

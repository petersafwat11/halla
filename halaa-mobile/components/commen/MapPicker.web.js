import React from "react";
import TextInput from "./DirectionalTextInput";
import { View, Text, StyleSheet } from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "../../localization";
import { useFieldDirection } from "../../hooks/useInputDirection";

// Expo web supports the same manual-address fallback as native. Interactive
// native map selection and location permissions still require a device test.
function ManualAddress({ label, placeholder, value, onChange, error, disabled }) {
  const { t } = useTranslation("common");
  const direction = useFieldDirection("adaptive", { hasValue: !!value?.address, value: value?.address });
  return <View style={styles.container}>
    {!!label && <Text style={styles.label}>{label}</Text>}
    <TextInput contentDirection="adaptive" accessibilityLabel={label || placeholder} placeholder={placeholder} editable={!disabled} value={value?.address || ""}
      onChangeText={address => onChange({ address, city: "", country: "", latitude: null, longitude: null, placeId: "", provider: "manual" })}
      style={[styles.input, direction.input, error && styles.invalid]} />
    <Text style={styles.hint}>{t("picker.manualAddress", "Enter the venue address manually. Interactive map selection is available in the mobile app.")}</Text>
    {!!error && <Text style={styles.error}>{error.message}</Text>}
  </View>;
}
function FormAddress({ name, rules, ...props }) {
  const { control } = useFormContext();
  return <Controller control={control} name={name} rules={rules} render={({ field, fieldState }) => <ManualAddress {...props} value={field.value} onChange={field.onChange} error={fieldState.error} />} />;
}
export default function MapPicker({ name, ...props }) {
  return name ? <FormAddress name={name} {...props} /> : <ManualAddress {...props} />;
}
const styles = StyleSheet.create({
  container: { width: "100%", marginBottom: 16, gap: 8 },
  label: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#2C2C2C" },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 12, backgroundColor: "#FFF", fontSize: 14, fontFamily: "Cairo_400Regular" },
  hint: { fontSize: 12, color: "#656565", lineHeight: 20 },
  invalid: { borderColor: "#C0392B" },
  error: { fontSize: 12, color: "#C0392B" },
});

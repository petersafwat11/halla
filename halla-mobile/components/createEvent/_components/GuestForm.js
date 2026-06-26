import React, { useState, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity } from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../../localization";
import EventsService from "../../../hooks/events/useEventForm";
import Button from "../../commen/Button";

export default function GuestForm({ isLimitReached, categories = [] }) {
  const { t } = useTranslation("createEvent");
  const { setValue, watch } = useFormContext();
  const formData = watch();

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCategory, setGuestCategory] = useState("");
  const [guestErrors, setGuestErrors] = useState({});

  const handleAddGuest = useCallback(() => {
    if (isLimitReached) {
      Alert.alert(t("guest_limit_reached"), t("upgrade_hint"), [{ text: t("close") }]);
      return;
    }
    const guest = { name: guestName, phone: guestPhone, category: guestCategory };
    const result = EventsService.addListItem(guest, formData.guestList, "guest");
    if (result.success) {
      setValue("guestList", result.list, { shouldValidate: true });
      setGuestName("");
      setGuestPhone("");
      setGuestCategory("");
      setGuestErrors({});
    } else {
      setGuestErrors(result.errors);
    }
  }, [guestName, guestPhone, guestCategory, formData.guestList, setValue, isLimitReached, t]);

  return (
    <View style={styles.form}>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{t("guest_name")}</Text>
        <TextInput
          style={[styles.textInput, guestErrors.name && styles.textInputError, isLimitReached && styles.textInputDisabled]}
          placeholder={t("guest_name_placeholder")}
          placeholderTextColor="#999"
          value={guestName}
          onChangeText={setGuestName}
          editable={!isLimitReached}
        />
        {guestErrors.name && <Text style={styles.errorText}>{t(guestErrors.name)}</Text>}
      </View>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{t("guest_phone")}</Text>
        <TextInput
          style={[styles.textInput, { writingDirection: "ltr" }, guestErrors.phone && styles.textInputError, isLimitReached && styles.textInputDisabled]}
          placeholder={t("guest_phone_placeholder")}
          placeholderTextColor="#999"
          value={guestPhone}
          onChangeText={setGuestPhone}
          keyboardType="phone-pad"
          editable={!isLimitReached}
        />
        {guestErrors.phone && <Text style={styles.errorText}>{t(guestErrors.phone)}</Text>}
      </View>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{t("category")}</Text>
        <TextInput
          style={[styles.textInput, isLimitReached && styles.textInputDisabled]}
          placeholder={t("category_placeholder")}
          placeholderTextColor="#999"
          value={guestCategory}
          onChangeText={setGuestCategory}
          editable={!isLimitReached}
          maxLength={60}
        />
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categories.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, guestCategory === c && styles.chipActive]}
                onPress={() => setGuestCategory(guestCategory === c ? "" : c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, guestCategory === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      <Button
        text={t("add_guest")}
        onPress={handleAddGuest}
        disabled={!guestName.trim() || !guestPhone.trim() || isLimitReached}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { marginBottom: 24 },
  inputWrapper: { marginBottom: 16, width: "100%" },
  inputLabel: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#2c2c2c", marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
  },
  textInputError: { borderColor: "#e74c3c" },
  textInputDisabled: { backgroundColor: "#F5F5F5", borderColor: "#E0E0E0", color: "#AAAAAA" },
  errorText: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#e74c3c", marginTop: 4 },
  chipRow: { gap: 8, paddingTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E0D5C7",
    backgroundColor: "#F9F4EF",
  },
  chipActive: { backgroundColor: "#C28E5C", borderColor: "#C28E5C" },
  chipText: { fontSize: 12, fontFamily: "Cairo_500Medium", color: "#8A6B47" },
  chipTextActive: { color: "#FFF" },
});

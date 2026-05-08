import React, { useState, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../../localization";
import EventsService from "../../../services/EventsService";
import Button from "../../commen/Button";

export default function GuestForm({ isLimitReached }) {
  const { t } = useTranslation("admin");
  const { setValue, watch } = useFormContext();
  const formData = watch();

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestErrors, setGuestErrors] = useState({});

  const handleAddGuest = useCallback(() => {
    if (isLimitReached) {
      Alert.alert(t("events.guestLimit.title"), t("events.guestLimit.message"), [{ text: t("common.ok") }]);
      return;
    }
    const guest = { name: guestName, phone: guestPhone };
    const result = EventsService.addListItem(guest, formData.guestList, "guest");
    if (result.success) {
      setValue("guestList", result.list, { shouldValidate: true });
      setGuestName("");
      setGuestPhone("");
      setGuestErrors({});
    } else {
      setGuestErrors(result.errors);
    }
  }, [guestName, guestPhone, formData.guestList, setValue, isLimitReached, t]);

  return (
    <View style={styles.form}>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{t("events.guest.nameLabel")}</Text>
        <TextInput
          style={[styles.textInput, guestErrors.name && styles.textInputError, isLimitReached && styles.textInputDisabled]}
          placeholder={t("events.guest.namePlaceholder")}
          placeholderTextColor="#999"
          value={guestName}
          onChangeText={setGuestName}
          editable={!isLimitReached}
        />
        {guestErrors.name && <Text style={styles.errorText}>{t(guestErrors.name)}</Text>}
      </View>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{t("events.guest.phoneLabel")}</Text>
        <TextInput
          style={[styles.textInput, guestErrors.phone && styles.textInputError, isLimitReached && styles.textInputDisabled]}
          placeholder={t("events.guest.phonePlaceholder")}
          placeholderTextColor="#999"
          value={guestPhone}
          onChangeText={setGuestPhone}
          keyboardType="phone-pad"
          editable={!isLimitReached}
        />
        {guestErrors.phone && <Text style={styles.errorText}>{t(guestErrors.phone)}</Text>}
      </View>
      <Button
        text={t("events.guest.addGuest")}
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
    textAlign: "right",
  },
  textInputError: { borderColor: "#e74c3c" },
  textInputDisabled: { backgroundColor: "#F5F5F5", borderColor: "#E0E0E0", color: "#AAAAAA" },
  errorText: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#e74c3c", marginTop: 4 },
});

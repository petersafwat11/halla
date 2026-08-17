import React, { useState, useCallback } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../../localization";
import EventsService from "../../../hooks/events/useEventForm";
import Button from "../../commen/Button";

export default function ModeratorForm() {
  const { t } = useTranslation("createEvent");
  const { setValue, watch } = useFormContext();
  const formData = watch();

  const [moderatorName, setModeratorName] = useState("");
  const [moderatorPhone, setModeratorPhone] = useState("");
  const [moderatorErrors, setModeratorErrors] = useState({});

  const handleAddModerator = useCallback(() => {
    const moderator = { name: moderatorName, phone: moderatorPhone };
    const result = EventsService.addListItem(moderator, formData.staffList || [], "moderator");
    if (result.success) {
      setValue("staffList", result.list, { shouldValidate: true });
      setModeratorName("");
      setModeratorPhone("");
      setModeratorErrors({});
    } else {
      setModeratorErrors(result.errors);
    }
  }, [moderatorName, moderatorPhone, formData.staffList, setValue]);

  return (
    <View style={styles.form}>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{t("staff_name")}</Text>
        <TextInput
          style={[styles.textInput, moderatorErrors.name && styles.textInputError]}
          placeholder={t("staff_name_placeholder")}
          placeholderTextColor="#999"
          value={moderatorName}
          onChangeText={setModeratorName}
        />
        {moderatorErrors.name && <Text style={styles.errorText}>{t(moderatorErrors.name)}</Text>}
      </View>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{t("staff_phone")}</Text>
        <TextInput
          style={[styles.textInput, { writingDirection: "ltr" }, moderatorErrors.phone && styles.textInputError]}
          placeholder={t("staff_phone_placeholder")}
          placeholderTextColor="#999"
          value={moderatorPhone}
          onChangeText={setModeratorPhone}
          keyboardType="phone-pad"
        />
        {moderatorErrors.phone && <Text style={styles.errorText}>{t(moderatorErrors.phone)}</Text>}
      </View>
      <Button
        text={t("add_staff")}
        onPress={handleAddModerator}
        disabled={!moderatorName.trim() || !moderatorPhone.trim()}
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
  errorText: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#e74c3c", marginTop: 4 },
});

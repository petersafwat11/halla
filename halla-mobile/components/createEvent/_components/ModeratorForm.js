import React, { useState, useCallback } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../../localization";
import EventsService from "../../../services/EventsService";
import Button from "../../commen/Button";

export default function ModeratorForm() {
  const { t } = useTranslation("admin");
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
        <Text style={styles.inputLabel}>{t("events.moderator.nameLabel")}</Text>
        <TextInput
          style={[styles.textInput, moderatorErrors.name && styles.textInputError]}
          placeholder={t("events.moderator.namePlaceholder")}
          placeholderTextColor="#999"
          value={moderatorName}
          onChangeText={setModeratorName}
        />
        {moderatorErrors.name && <Text style={styles.errorText}>{moderatorErrors.name}</Text>}
      </View>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{t("events.moderator.phoneLabel")}</Text>
        <TextInput
          style={[styles.textInput, moderatorErrors.phone && styles.textInputError]}
          placeholder={t("events.moderator.phonePlaceholder")}
          placeholderTextColor="#999"
          value={moderatorPhone}
          onChangeText={setModeratorPhone}
          keyboardType="phone-pad"
        />
        {moderatorErrors.phone && <Text style={styles.errorText}>{moderatorErrors.phone}</Text>}
      </View>
      <Button
        text={t("events.moderator.addModerator")}
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
    textAlign: "right",
  },
  textInputError: { borderColor: "#e74c3c" },
  errorText: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#e74c3c", marginTop: 4 },
});

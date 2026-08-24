import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../../localization";
import EventsService from "../../../hooks/events/useEventForm";
import Button from "../../commen/Button";
import FormField from "../../commen/FormField";
import {
  clampPhoneInput,
  getPhoneMaxLength,
  DEFAULT_PHONE_PLACEHOLDER,
} from "@halaa/shared/utils/phone";

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
      {/* Adaptive name + localized label/error via the shared field shell. */}
      <FormField
        label={t("staff_name")}
        placeholder={t("staff_name_placeholder")}
        value={moderatorName}
        onChangeText={(text) => {
          setModeratorName(text);
          if (moderatorErrors.name) setModeratorErrors((prev) => ({ ...prev, name: null }));
        }}
        contentDirection="adaptive"
        error={moderatorErrors.name ? t(moderatorErrors.name) : null}
      />
      {/* Phone digits stay LTR once typing. */}
      <FormField
        label={t("staff_phone")}
        placeholder={t("staff_phone_placeholder", DEFAULT_PHONE_PLACEHOLDER)}
        value={moderatorPhone}
        onChangeText={(text) => {
          setModeratorPhone(clampPhoneInput(text));
          if (moderatorErrors.phone) setModeratorErrors((prev) => ({ ...prev, phone: null }));
        }}
        contentDirection="phone"
        keyboardType="phone-pad"
        maxLength={getPhoneMaxLength(moderatorPhone)}
        error={moderatorErrors.phone ? t(moderatorErrors.phone) : null}
      />
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
});

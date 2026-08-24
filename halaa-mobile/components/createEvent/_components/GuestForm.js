import React, { useState, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "../../../localization";
import EventsService from "../../../hooks/events/useEventForm";
import Button from "../../commen/Button";
import FormField from "../../commen/FormField";
import CategorySelect from "../../commen/CategorySelect";
import {
  clampPhoneInput,
  getPhoneMaxLength,
  DEFAULT_PHONE_PLACEHOLDER,
} from "@halaa/shared/utils/phone";

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
      {/* Arbitrary user text → adaptive: empty placeholder follows the UI
          locale, a filled value follows its first strong character so Latin
          names such as "Ali" render LTR inside Arabic UI. */}
      <FormField
        label={t("guest_name")}
        placeholder={t("guest_name_placeholder")}
        value={guestName}
        onChangeText={(text) => {
          setGuestName(text);
          if (guestErrors.name) setGuestErrors((prev) => ({ ...prev, name: null }));
        }}
        contentDirection="adaptive"
        editable={!isLimitReached}
        error={guestErrors.name ? t(guestErrors.name) : null}
      />
      {/* Phone digits stay LTR once typing; the empty placeholder stays in
          the UI locale. */}
      <FormField
        label={t("guest_phone")}
        placeholder={t("guest_phone_placeholder", DEFAULT_PHONE_PLACEHOLDER)}
        value={guestPhone}
        onChangeText={(text) => {
          setGuestPhone(clampPhoneInput(text));
          if (guestErrors.phone) setGuestErrors((prev) => ({ ...prev, phone: null }));
        }}
        contentDirection="phone"
        keyboardType="phone-pad"
        maxLength={getPhoneMaxLength(guestPhone)}
        editable={!isLimitReached}
        error={guestErrors.phone ? t(guestErrors.phone) : null}
      />
      <View style={styles.inputWrapper}>
        <CategorySelect
          label={t("category")}
          placeholder={t("category_placeholder")}
          value={guestCategory}
          onChange={setGuestCategory}
          options={categories}
          disabled={isLimitReached}
        />
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
});

import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "../../localization";
import Button from "../commen/Button";
import FormField from "../commen/FormField";
import LocalizedText from "../commen/LocalizedText";
import CategorySelect from "../commen/CategorySelect";
import KeyboardSafeModalSheet from "../commen/keyboard/KeyboardSafeModalSheet";
import Svg, { Path } from "react-native-svg";
import {
  clampPhoneInput,
  getPhoneMaxLength,
  DEFAULT_PHONE_PLACEHOLDER,
} from "@halaa/shared/utils/phone";

const CloseIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke="#656565"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EditGuestOrModeratorsModal = ({
  visible,
  onClose,
  item,
  type = "guest",
  onSave,
  categories = [],
}) => {
  const { t } = useTranslation(["events", "createEvent"]);
  const { t: tCreate } = useTranslation("createEvent");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setPhone(item.phone || item.mobile || "");
      setCategory(item.category || "");
      setErrors({});
    }
  }, [item]);

  const handleSave = () => {
    const result = onSave(item?.id, { name, phone, category });

    if (result && !result.success && result.errors) {
      setErrors(result.errors);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const header = (
    <View style={styles.header}>
      <LocalizedText role="sectionTitle" style={styles.headerTitle}>
        {type === "guest"
          ? tCreate("edit_guest")
          : tCreate("edit_moderator")}
      </LocalizedText>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={tCreate("close")}
      >
        <CloseIcon />
      </TouchableOpacity>
    </View>
  );

  const footer = (
    <View style={styles.actions}>
      <Button
        text={tCreate("save_changes")}
        onPress={handleSave}
        disabled={!name.trim() || !phone.trim()}
      />
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <LocalizedText style={styles.cancelButtonText}>
          {tCreate("cancel")}
        </LocalizedText>
      </TouchableOpacity>
    </View>
  );

  return (
    // Small centered card (§6.4): the shared avoiding owner lifts the card
    // above the keyboard; the compact form body scrolls only if font scaling
    // requires it.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={handleClose}
      onRequestClose={handleClose}
      header={header}
      footer={footer}
      centered
      animationType="fade"
      sheetStyle={styles.modalContainer}
    >
      {/* Form */}
      <View style={styles.form}>
        {/* Arbitrary user text → adaptive through the shared field shell:
            label/error stay in the UI locale while Latin names render LTR
            and Arabic names RTL. */}
        <FormField
          label={
            type === "guest"
              ? tCreate("guest_name")
              : tCreate("moderator_name")
          }
          placeholder={
            type === "guest"
              ? tCreate("guest_name_placeholder")
              : tCreate("moderator_name_placeholder")
          }
          value={name}
          onChangeText={(text) => {
            setName(text);
            setErrors((prev) => ({ ...prev, name: null }));
          }}
          contentDirection="adaptive"
          error={errors.name ? t(errors.name, { defaultValue: errors.name }) : null}
        />

        {/* Phone digits remain LTR once filled. */}
        <FormField
          label={
            type === "guest"
              ? tCreate("guest_phone")
              : tCreate("moderator_phone")
          }
          placeholder={tCreate("guest_phone_placeholder", DEFAULT_PHONE_PLACEHOLDER)}
          value={phone}
          onChangeText={(text) => {
            const clamped = clampPhoneInput(text);
            setPhone(clamped);
            setErrors((prev) => ({ ...prev, phone: null }));
          }}
          contentDirection="phone"
          keyboardType="phone-pad"
          maxLength={getPhoneMaxLength(phone)}
          error={errors.phone ? t(errors.phone, { defaultValue: errors.phone }) : null}
        />

        {type === "guest" && (
          <View style={styles.inputWrapper}>
            <CategorySelect
              label={tCreate("category")}
              placeholder={tCreate("category_placeholder")}
              value={category}
              onChange={setCategory}
              options={categories}
            />
          </View>
        )}
      </View>
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    maxWidth: 400,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 24,
  },
  inputWrapper: {
    marginBottom: 16,
    width: "100%",
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
  },
});

export default EditGuestOrModeratorsModal;

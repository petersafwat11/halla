import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import ActionButton from "../common/ActionButton";
import { useChangePassword } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, form, textStyles, backgrounds } from "../../../styles/tokens";

const SettingsSecurity = () => {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const changePasswordMutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loading = changePasswordMutation.isPending;

  const handleChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error(t("security.passwordsDoNotMatch"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("security.passwordTooShort"));
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
        passwordConfirm: confirmPassword,
      });
      toast.success(t("security.changeSuccess"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.message || t("security.changeError"));
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t("security.title")}</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder={t("security.currentPassword")}
          placeholderTextColor={form.fg.active}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder={t("security.newPassword")}
          placeholderTextColor={form.fg.active}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder={t("security.confirmPassword")}
          placeholderTextColor={form.fg.active}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!loading}
        />
        <ActionButton
          label={loading ? t("security.changing") : t("security.changePassword")}
          onPress={handleChange}
          variant="primary"
          disabled={!currentPassword || !newPassword || !confirmPassword || loading}
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { padding: spacing[16] },
  title: { ...textStyles.titleMedium, color: colors.natural[900], marginBottom: spacing[12] },
  card: { backgroundColor: backgrounds.card[1], padding: spacing[16], borderRadius: borderRadius[12], gap: spacing[12] },
  input: {
    backgroundColor: form.bg.active, borderWidth: 1, borderColor: form.border.active,
    borderRadius: borderRadius[8], padding: spacing[12], ...textStyles.bodyMedium, color: colors.natural[900],
  },
});

export default SettingsSecurity;

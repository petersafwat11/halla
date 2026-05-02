import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import ActionButton from "../common/ActionButton";
import { useAuthStore } from "../../../stores/authStore";
import { changePasswordAPI } from "../../../services/settingsService";
import { colors, spacing, borderRadius, form, textStyles, backgrounds } from "../../../styles/tokens";

const SettingsSecurity = () => {
  const token = useAuthStore((state) => state.token);
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!current || !newPass || !confirm) return;
    if (newPass !== confirm) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (newPass.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await changePasswordAPI({ currentPassword: current, newPassword: newPass }, token);
      Alert.alert("Success", "Password changed successfully");
      setCurrent(""); setNewPass(""); setConfirm("");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Security</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Current Password"
          placeholderTextColor={form.fg.active}
          secureTextEntry
          value={current}
          onChangeText={setCurrent}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor={form.fg.active}
          secureTextEntry
          value={newPass}
          onChangeText={setNewPass}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={form.fg.active}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          editable={!loading}
        />
        <ActionButton
          label={loading ? "Changing..." : "Change Password"}
          onPress={handleChange}
          variant="primary"
          disabled={!current || !newPass || !confirm || loading}
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

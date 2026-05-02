import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { getRoleDisplayName } from "../../../utils/adminPermissions";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";
import { Ionicons } from "@expo/vector-icons";

const SettingsAccount = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Account</Text>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="person-circle-outline" size={48} color={colors.primary[500]} />
        </View>
        <Row label="Name" value={user?.name || user?.username || "Admin"} />
        <Row label="Email" value={user?.email || "—"} />
        <Row label="Role" value={getRoleDisplayName(user?.role)} />
        {user?.phone && <Row label="Phone" value={user.phone} />}
      </View>
    </View>
  );
};

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  section: { padding: spacing[16] },
  title: { ...textStyles.titleMedium, color: colors.natural[900], marginBottom: spacing[12] },
  card: { backgroundColor: backgrounds.card[1], padding: spacing[16], borderRadius: borderRadius[12] },
  avatar: { alignItems: "center", marginBottom: spacing[12] },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing[8], borderBottomWidth: 1, borderBottomColor: colors.natural[200] },
  label: { ...textStyles.bodySmall, color: colors.natural[450] },
  value: { ...textStyles.bodySmall, color: colors.natural[900] },
});

export default SettingsAccount;

import React from "react";
import { View, Text, Switch, StyleSheet, ActivityIndicator } from "react-native";
import { useNotificationSettings, useUpdateNotificationSettings } from "../../../hooks";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";

const APP_KEYS = [
  "newUsers",
  "vendorApprovals",
  "supportTickets",
  "systemAlerts",
  "paymentAlerts",
  "subscriptionAlerts",
];

const EMAIL_KEYS = [
  "dailyReport",
  "weeklyReport",
  "vendorApprovals",
  "supportTickets",
  "criticalAlerts",
];

const SettingsNotifications = () => {
  const { t } = useTranslation("settings");
  const { data: prefs, isLoading } = useNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();

  const appNotifications = prefs?.appNotifications || {};
  const emailNotifications = prefs?.emailNotifications || {};

  const handleToggle = (section, key, value) => {
    const next = {
      appNotifications,
      emailNotifications,
      [section]: { ...(prefs?.[section] || {}), [key]: value },
    };
    updateMutation.mutate(next);
  };

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>{t("adminNotifications.title")}</Text>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t("adminNotifications.title")}</Text>
        {updateMutation.isPending && (
          <ActivityIndicator size="small" color={colors.primary[500]} />
        )}
      </View>

      <Text style={styles.groupLabel}>{t("adminNotifications.inApp")}</Text>
      <View style={styles.card}>
        {APP_KEYS.map((key) => (
          <ToggleRow
            key={key}
            label={t(`adminNotifications.app.${key}`)}
            value={!!appNotifications[key]}
            onChange={(v) => handleToggle("appNotifications", key, v)}
          />
        ))}
      </View>

      <Text style={[styles.groupLabel, { marginTop: spacing[16] }]}>
        {t("adminNotifications.email")}
      </Text>
      <View style={styles.card}>
        {EMAIL_KEYS.map((key) => (
          <ToggleRow
            key={key}
            label={t(`adminNotifications.email.${key}`)}
            value={!!emailNotifications[key]}
            onChange={(v) => handleToggle("emailNotifications", key, v)}
          />
        ))}
      </View>
    </View>
  );
};

const ToggleRow = ({ label, value, onChange }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: colors.primary[500], false: colors.natural[300] }}
      thumbColor={colors.natural[50]}
    />
  </View>
);

const styles = StyleSheet.create({
  section: { padding: spacing[16] },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing[12] },
  title: { ...textStyles.titleMedium, color: colors.natural[900] },
  groupLabel: { ...textStyles.bodySmall, color: colors.natural[450], marginBottom: spacing[8] },
  card: { backgroundColor: backgrounds.card[1], padding: spacing[16], borderRadius: borderRadius[12] },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing[8], borderBottomWidth: 1, borderBottomColor: colors.natural[200] },
  label: { ...textStyles.bodyMedium, color: colors.natural[900] },
});

export default SettingsNotifications;

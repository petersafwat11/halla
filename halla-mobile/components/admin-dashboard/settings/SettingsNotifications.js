import React, { useState, useEffect } from "react";
import { View, Text, Switch, StyleSheet, ActivityIndicator } from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { getNotificationPreferencesAPI, updateNotificationPreferencesAPI } from "../../../services/settingsService";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";

const SettingsNotifications = () => {
  const token = useAuthStore((state) => state.token);
  const [prefs, setPrefs] = useState({
    appNotifications: { eventUpdates: true, subscriptionAlerts: true, systemUpdates: true },
    emailNotifications: { weeklyReport: true, criticalAlerts: true },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const data = await getNotificationPreferencesAPI();
        const p = data?.data?.preferences || data?.preferences;
        if (p?.appNotifications || p?.emailNotifications) {
          setPrefs({
            appNotifications: p.appNotifications || {},
            emailNotifications: p.emailNotifications || {},
          });
        }
      } catch (error) {
        // silent — UI shows nothing rather than crashing
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchPrefs();
  }, [token]);

  const handleToggle = async (section, key, value) => {
    const updated = {
      ...prefs,
      [section]: { ...prefs[section], [key]: value },
    };
    setPrefs(updated);
    setSaving(true);
    try {
      await updateNotificationPreferencesAPI(updated);
    } catch (error) {
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Notifications</Text>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Notifications</Text>
        {saving && <ActivityIndicator size="small" color={colors.primary[500]} />}
      </View>

      <Text style={styles.groupLabel}>In-App</Text>
      <View style={styles.card}>
        {Object.entries(prefs.appNotifications).map(([key, value]) => (
          <ToggleRow
            key={key}
            label={formatKey(key)}
            value={!!value}
            onChange={(v) => handleToggle("appNotifications", key, v)}
          />
        ))}
      </View>

      <Text style={[styles.groupLabel, { marginTop: spacing[16] }]}>Email</Text>
      <View style={styles.card}>
        {Object.entries(prefs.emailNotifications).map(([key, value]) => (
          <ToggleRow
            key={key}
            label={formatKey(key)}
            value={!!value}
            onChange={(v) => handleToggle("emailNotifications", key, v)}
          />
        ))}
      </View>
    </View>
  );
};

const formatKey = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

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

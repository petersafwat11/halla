import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";
import Constants from "expo-constants";

const SettingsSystem = () => {
  const version = Constants.expoConfig?.version || "1.0.0";

  return (
    <View style={styles.section}>
      <Text style={styles.title}>System</Text>
      <View style={styles.card}>
        <Row label="App Version" value={version} />
        <Row label="Language" value="English" />
        <Row label="Platform" value={Constants.platform?.ios ? "iOS" : "Android"} />
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
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing[8], borderBottomWidth: 1, borderBottomColor: colors.natural[200] },
  label: { ...textStyles.bodySmall, color: colors.natural[450] },
  value: { ...textStyles.bodySmall, color: colors.natural[900] },
});

export default SettingsSystem;

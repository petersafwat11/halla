import React from "react";
import { View, Text, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";

const SettingsAbout = () => (
  <View style={styles.section}>
    <Text style={styles.title}>About</Text>
    <View style={styles.card}>
      <LinkRow icon="document-text-outline" label="Terms of Service" onPress={() => Linking.openURL("https://halla.app/terms")} />
      <LinkRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => Linking.openURL("https://halla.app/privacy")} />
      <LinkRow icon="help-circle-outline" label="Help Center" onPress={() => Linking.openURL("https://halla.app/help")} />
    </View>
  </View>
);

const LinkRow = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.row} onPress={onPress}>
    <View style={styles.rowLeft}>
      <Ionicons name={icon} size={20} color={colors.primary[500]} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.natural[400]} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  section: { padding: spacing[16] },
  title: { ...textStyles.titleMedium, color: colors.natural[900], marginBottom: spacing[12] },
  card: { backgroundColor: backgrounds.card[1], padding: spacing[16], borderRadius: borderRadius[12] },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing[12], borderBottomWidth: 1, borderBottomColor: colors.natural[200] },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing[12] },
  label: { ...textStyles.bodyMedium, color: colors.primary[500] },
});

export default SettingsAbout;

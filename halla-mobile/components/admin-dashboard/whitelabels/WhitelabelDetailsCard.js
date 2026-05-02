import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";
import StatusBadge from "../common/StatusBadge";

const WhitelabelDetailsCard = ({ whitelabel }) => {
  if (!whitelabel) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{whitelabel.name}</Text>
        {whitelabel.status && <StatusBadge status={whitelabel.status} />}
      </View>
      <Section label="Domain" value={whitelabel.domain} />
      <Section label="Plan" value={whitelabel.plan || whitelabel.subscription?.plan} />
      <Section label="Owner" value={whitelabel.ownerName || whitelabel.owner?.name} />
      <Section label="Email" value={whitelabel.email || whitelabel.owner?.email} />
      {whitelabel.subscription && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <Section label="Status" value={whitelabel.subscription.status} />
          <Section label="Expires" value={whitelabel.subscription.expiresAt ? new Date(whitelabel.subscription.expiresAt).toLocaleDateString() : "N/A"} />
        </View>
      )}
      {whitelabel.createdAt && <Section label="Created" value={new Date(whitelabel.createdAt).toLocaleDateString()} />}
    </View>
  );
};

const Section = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: backgrounds.card[1], padding: spacing[16], margin: spacing[16], borderRadius: borderRadius[12] },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing[16] },
  name: { ...textStyles.titleMedium, color: colors.natural[900], flex: 1 },
  section: { marginTop: spacing[12], paddingTop: spacing[12], borderTopWidth: 1, borderTopColor: colors.natural[200] },
  sectionTitle: { ...textStyles.labelLarge, color: colors.natural[900], marginBottom: spacing[8] },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing[8] },
  label: { ...textStyles.bodySmall, color: colors.natural[450] },
  value: { ...textStyles.bodySmall, color: colors.natural[900] },
});

export default WhitelabelDetailsCard;

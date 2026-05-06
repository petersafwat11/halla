import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import StatusBadge from "../../admin-dashboard/common/StatusBadge";
import { backgrounds, colors, spacing, borderRadius, typography, textStyles } from "../../../styles/tokens";

const planLabels = {
  ENTERPRISE_BASIC: "plans.ENTERPRISE_BASIC",
  ENTERPRISE_PRO: "plans.ENTERPRISE_PRO",
  ENTERPRISE_ULTIMATE: "plans.ENTERPRISE_ULTIMATE",
};

const WhitelabelHeroCard = ({ whitelabel }) => {
  const { t } = useTranslation("admin");
  const planCode = whitelabel.subscription?.planId?.code || whitelabel.subscription?.planCode;
  const planName = whitelabel.subscription?.planId?.nameEn || t(planLabels[planCode] || planCode) || planCode;

  return (
    <View style={styles.card}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {(whitelabel.name || whitelabel.username || "?").charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.name}>{whitelabel.name || whitelabel.username || "—"}</Text>
      {whitelabel.username ? (
        <Text style={styles.username}>@{whitelabel.username}</Text>
      ) : null}
      <View style={styles.badgeRow}>
        <StatusBadge status={whitelabel.status} />
        {planName ? (
          <View style={styles.planChip}>
            <Ionicons name="star-outline" size={11} color={colors.primary[500]} />
            <Text style={styles.planChipText}>{planName}</Text>
          </View>
        ) : null}
      </View>
      {whitelabel.email ? (
        <View style={styles.metaRow}>
          <Ionicons name="mail-outline" size={13} color={colors.natural[400]} />
          <Text style={styles.metaText}>{whitelabel.email}</Text>
        </View>
      ) : null}
      {whitelabel.phoneNumber ? (
        <View style={styles.metaRow}>
          <Ionicons name="call-outline" size={13} color={colors.natural[400]} />
          <Text style={styles.metaText}>{whitelabel.phoneNumber}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[16],
    alignItems: "center",
    paddingVertical: spacing[24],
    paddingHorizontal: spacing[20],
    gap: spacing[8],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary[500]}18`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  avatarText: {
    fontSize: typography.fontSize.headline.small,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
  },
  name: { ...textStyles.titleLarge, color: colors.natural[900] },
  username: { fontSize: typography.fontSize.body.small, color: colors.natural[400] },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing[8], marginTop: spacing[4] },
  planChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    backgroundColor: "#fdf5ec",
    borderRadius: borderRadius[8],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  planChipText: { fontSize: typography.fontSize.label.small, fontWeight: typography.fontWeight.medium, color: colors.primary[500] },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  metaText: { fontSize: typography.fontSize.body.small, color: colors.natural[450] },
});

export default WhitelabelHeroCard;

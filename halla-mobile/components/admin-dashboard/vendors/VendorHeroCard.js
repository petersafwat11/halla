import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, typography, backgrounds } from "../../../styles/tokens";

const STATUS_CONFIG = {
  approved: { color: colors.success[500], bg: "#e8f5ee", labelKey: "approved" },
  active: { color: colors.success[500], bg: "#e8f5ee", labelKey: "approved" },
  pending: { color: colors.warning[500], bg: "#fff4e0", labelKey: "pending" },
  rejected: { color: colors.error[500], bg: "#fdecea", labelKey: "rejected" },
  suspended: { color: colors.error[500], bg: "#fdecea", labelKey: "suspended" },
  inactive: { color: colors.natural[450], bg: colors.natural[150], labelKey: "suspended" },
};

const VendorHeroCard = ({ vendor }) => {
  const { t } = useTranslation("admin");
  const status = vendor?.status || "pending";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const statusLabel = t(`vendorDetails.statuses.${statusCfg.labelKey}`, statusCfg.labelKey);
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const displayName = roleData?.brandName || vendor?.brandName || vendor?.username || "—";
  const ownerName = roleData?.ownerFullName || roleData?.ownerName || vendor?.name || "—";
  const email = vendor?.email || roleData?.email || "—";
  const phone = vendor?.phoneNumber || roleData?.phone || "—";
  const rating = roleData?.rating ?? vendor?.averageRating;

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="storefront-outline" size={32} color={colors.primary[500]} />
      </View>

      <Text style={styles.brandName}>{displayName}</Text>
      <Text style={styles.ownerName}>{ownerName}</Text>

      <View style={styles.contactRow}>
        <Ionicons name="mail-outline" size={13} color={colors.natural[400]} />
        <Text style={styles.contactText}>{email}</Text>
      </View>
      {phone !== "—" && (
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={13} color={colors.natural[400]} />
          <Text style={styles.contactText}>{phone}</Text>
        </View>
      )}

      <View style={styles.badgeRow}>
        <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
          <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
            {statusLabel}
          </Text>
        </View>
        {rating != null && (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={13} color={colors.warning[500]} />
            <Text style={styles.ratingText}>{Number(rating).toFixed(1)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    marginHorizontal: spacing[16],
    marginTop: spacing[16],
    marginBottom: spacing[12],
    borderRadius: borderRadius[16],
    alignItems: "center",
    paddingVertical: spacing[24],
    paddingHorizontal: spacing[16],
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fdf3e7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[12],
  },
  brandName: {
    fontSize: typography.fontSize.title.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
    marginBottom: spacing[4],
    textAlign: "center",
  },
  ownerName: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
    marginBottom: spacing[12],
    textAlign: "center",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  contactText: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[500],
    marginLeft: spacing[4],
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[12],
    gap: spacing[8],
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing[4],
  },
  statusLabel: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
    backgroundColor: "#fff4e0",
    gap: spacing[4],
  },
  ratingText: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning[500],
    marginLeft: spacing[4],
  },
});

export default VendorHeroCard;

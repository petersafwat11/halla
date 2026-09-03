import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { formatNumber } from "@halaa/shared/utils/locale";
import LocalizedText from "../../commen/LocalizedText";
import AdaptiveText from "../../commen/AdaptiveText";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, typography, backgrounds } from "../../../styles/tokens";
import { getStatusVisual } from "../../../constants/statusColors";

// Map each status to its i18n label key (colors come from getStatusVisual).
const STATUS_LABEL_KEY = {
  approved: "approved",
  active: "approved",
  pending: "pending",
  rejected: "rejected",
  suspended: "suspended",
  inactive: "suspended",
};

const VendorHeroCard = ({ vendor }) => {
  const { t, currentLanguage } = useTranslation("admin");
  const status = vendor?.status || "pending";
  const statusVisual = getStatusVisual(status);
  const labelKey = STATUS_LABEL_KEY[status] || STATUS_LABEL_KEY.pending;
  const statusLabel = t(`vendorDetails.statuses.${labelKey}`, labelKey);
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const displayName = roleData?.brandName || vendor?.brandName || vendor?.name || "—";
  const ownerName = roleData?.ownerFullName || roleData?.ownerName || vendor?.name || "—";
  const email = vendor?.email || roleData?.email || "—";
  const phone = vendor?.phoneNumber || roleData?.phone || "—";
  const rating = roleData?.rating ?? vendor?.averageRating;

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Ionicons name="storefront-outline" size={32} color={colors.primary[500]} />
      </View>

      <AdaptiveText style={styles.brandName} numberOfLines={1}>
        {displayName}
      </AdaptiveText>
      <AdaptiveText style={styles.ownerName} numberOfLines={1}>
        {ownerName}
      </AdaptiveText>

      <View style={styles.contactRow}>
        <Ionicons name="mail-outline" size={13} color={colors.natural[400]} />
        <LocalizedText style={[styles.contactText, styles.ltrValue]}>
          {isolateLtr(email)}
        </LocalizedText>
      </View>
      {phone !== "—" && (
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={13} color={colors.natural[400]} />
          <LocalizedText style={[styles.contactText, styles.ltrValue]}>
            {isolateLtr(phone)}
          </LocalizedText>
        </View>
      )}

      <View style={styles.badgeRow}>
        <View style={[styles.statusChip, { backgroundColor: statusVisual.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusVisual.fg }]} />
          {/* Status label is app copy — always the UI locale. */}
          <LocalizedText style={[styles.statusLabel, { color: statusVisual.fg }]}>
            {statusLabel}
          </LocalizedText>
        </View>
        {rating != null && (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={13} color={colors.warning[500]} />
            <LocalizedText style={[styles.ratingText, styles.ltrValue]}>
              {/* Numeric ratings share the app digit policy (blueprint §6):
                  locale-formatted, never a raw toFixed() token. */}
              {formatNumber(Number(rating), currentLanguage, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </LocalizedText>
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
    marginStart: spacing[4],
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
    marginEnd: spacing[4],
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
    marginStart: spacing[4],
  },
  // Contact tokens and numeric ratings keep stable LTR glyph order.
  ltrValue: {
    writingDirection: "ltr",
  },
});

export default VendorHeroCard;

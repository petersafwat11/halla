import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getLocalized } from "../../utils/locale";
import { COMPENSATION_PERCENTAGE } from "../../utils/constants/plans";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

const isMonthly = (billingType) =>
  billingType === "monthly" ||
  (typeof billingType === "string" && billingType.endsWith("_monthly"));

const PlanSummaryCard = ({
  selectedPlan,
  billingType,
  locale,
  planPrice,
  t,
}) => {
  const monthly = isMonthly(billingType);

  const planName =
    getLocalized(selectedPlan, "name", locale) || t("summary.planDetails");

  const planSubtitle = monthly
    ? t("summary.unlimitedEvents")
    : t("summary.singleEvent");

  const inviteCount = monthly
    ? selectedPlan?.invitePool || 0
    : selectedPlan?.invites ?? selectedPlan?.limits?.maxInvitesPerEvent ?? 0;

  const inviteLabel = monthly
    ? `${inviteCount} ${t("summary.invitePool") || t("inviteSelector.poolLabel")}`
    : `${inviteCount} ${t("summary.invitesLabel")}`;

  const eventLabel = monthly
    ? t("summary.unlimitedEvents")
    : t("summary.oneEvent");

  const compensationCount = (() => {
    const pct = COMPENSATION_PERCENTAGE / 100;
    if (monthly) {
      return (
        selectedPlan?.compensationPool ??
        Math.floor((selectedPlan?.invitePool || 0) * pct)
      );
    }
    return Math.floor(inviteCount * pct);
  })();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t("summary.planDetails")}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.planInfo}>
          <View style={styles.planIcon}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.primary[600]}
            />
          </View>
          <View style={styles.planDetails}>
            <Text style={styles.planName} numberOfLines={2}>
              {planName}
            </Text>
            <Text style={styles.planType}>{planSubtitle}</Text>
          </View>
          <View style={styles.planPrice}>
            <Text style={styles.priceAmount}>{planPrice}</Text>
            <Text style={styles.priceCurrency}>{t("summary.currency")}</Text>
          </View>
        </View>

        <View style={styles.featuresSummary}>
          <FeatureRow
            iconName="people-outline"
            text={inviteLabel}
          />
          <FeatureRow
            iconName="calendar-outline"
            text={eventLabel}
          />
          <FeatureRow
            iconName="gift-outline"
            text={`${compensationCount} ${t("summary.compensationInvites")}`}
          />
        </View>
      </View>
    </View>
  );
};

const FeatureRow = ({ iconName, text }) => (
  <View style={styles.featureItem}>
    <Ionicons name={iconName} size={16} color={colors.primary[600]} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    marginBottom: spacing[12],
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
    backgroundColor: colors.natural[50],
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[900],
  },
  cardContent: {
    padding: spacing[16],
    gap: spacing[16],
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    padding: spacing[12],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius[12],
    backgroundColor: colors.natural[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    justifyContent: "center",
    alignItems: "center",
  },
  planDetails: {
    flex: 1,
    minWidth: 0,
  },
  planName: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[900],
    marginBottom: 2,
  },
  planType: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.medium,
    color: colors.natural[450],
  },
  planPrice: {
    alignItems: "flex-end",
  },
  priceAmount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
    color: colors.primary[700],
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  priceCurrency: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.small,
    color: colors.primary[600],
  },
  featuresSummary: {
    gap: spacing[8],
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: colors.natural[150],
    borderRadius: borderRadius[8],
  },
  featureText: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
    flex: 1,
  },
});

export default PlanSummaryCard;

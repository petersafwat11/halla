import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getLocalized } from "../../utils/locale";
import { DEFAULT_COMPENSATION_PERCENTAGE } from "../../utils/constants/plans";

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
  const getPlanDisplayName = () =>
    getLocalized(selectedPlan, "name", locale) || t("summary.planDetails");

  const getBillingTypeLabel = () => {
    if (isMonthly(billingType)) return t("summary.unlimitedEvents");
    return t("summary.oneEvent");
  };

  const getPlanTypeSubtitle = () =>
    isMonthly(billingType) ? t("summary.unlimitedEvents") : t("summary.singleEvent");

  const getCompensationInvites = () => {
    const pct =
      (selectedPlan?.compensationPercentage ?? DEFAULT_COMPENSATION_PERCENTAGE) / 100;
    if (isMonthly(billingType)) {
      return (
        selectedPlan?.compensationPool ??
        Math.floor((selectedPlan?.invitePool || 0) * pct)
      );
    }
    const invites =
      selectedPlan?.invites ?? selectedPlan?.limits?.maxInvitesPerEvent ?? 0;
    return Math.floor(invites * pct);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t("summary.planDetails")}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.planInfo}>
          <View style={styles.planIcon}>
            <Ionicons name="calendar-outline" size={24} color="#C28E5C" />
          </View>
          <View style={styles.planDetails}>
            <Text style={styles.planName}>{getPlanDisplayName()}</Text>
            <Text style={styles.planType}>{getPlanTypeSubtitle()}</Text>
          </View>
          <View style={styles.planPrice}>
            <Text style={styles.priceAmount}>{planPrice}</Text>
            <Text style={styles.priceCurrency}>{t("summary.currency")}</Text>
          </View>
        </View>

        <View style={styles.featuresSummary}>
          {isMonthly(billingType) ? (
            <View style={styles.featureItem}>
              <Ionicons name="people-outline" size={18} color="#C28E5C" />
              <Text style={styles.featureText}>
                {`${selectedPlan?.invitePool || 0} ${t("summary.invitePool") || t("inviteSelector.poolLabel")}`}
              </Text>
            </View>
          ) : (
            <View style={styles.featureItem}>
              <Ionicons name="people-outline" size={18} color="#C28E5C" />
              <Text style={styles.featureText}>
                {`${selectedPlan?.invites ?? selectedPlan?.limits?.maxInvitesPerEvent ?? 0} ${t("summary.invitesLabel")}`}
              </Text>
            </View>
          )}
          <View style={styles.featureItem}>
            <Ionicons name="calendar-outline" size={18} color="#C28E5C" />
            <Text style={styles.featureText}>{getBillingTypeLabel()}</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="gift-outline" size={18} color="#C28E5C" />
            <Text style={styles.featureText}>
              {getCompensationInvites()} {t("summary.compensationInvites")}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#2C2C2C",
  },
  cardContent: { gap: 16 },
  planInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5ECE4",
    justifyContent: "center",
    alignItems: "center",
  },
  planDetails: { flex: 1 },
  planName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#2C2C2C",
    marginBottom: 2,
  },
  planType: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#656565",
  },
  planPrice: { alignItems: "flex-end" },
  priceAmount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    color: "#C28E5C",
  },
  priceCurrency: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#8A6541",
  },
  featuresSummary: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F5ECE4",
    borderRadius: 8,
  },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#6B4E33",
  },
});

export default PlanSummaryCard;

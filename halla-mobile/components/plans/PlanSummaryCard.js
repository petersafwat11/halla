import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PlanSummaryCard = ({
  selectedPlan,
  billingType,
  isArabic,
  planPrice,
  t,
}) => {
  const getPlanDisplayName = () => {
    if (isArabic) {
      return (
        selectedPlan?.nameAr ||
        (billingType === "monthly" ? "باقة شهرية" : "باقة مناسبة")
      );
    }
    return (
      selectedPlan?.nameEn ||
      (billingType === "monthly" ? "Monthly Plan" : "Event Plan")
    );
  };

  const getBillingTypeLabel = () => {
    if (billingType === "monthly") return t("summary.unlimitedEvents");
    return t("summary.oneEvent");
  };

  const getCompensationInvites = () => {
    if (billingType === "monthly") {
      return (
        selectedPlan?.compensationPool ||
        Math.floor((selectedPlan?.invitePool || 0) * 0.15)
      );
    }
    const invites =
      selectedPlan?.invites ?? selectedPlan?.limits?.maxInvitesPerEvent ?? 25;
    return Math.floor(invites * 0.15);
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
            <Text style={styles.planType}>{t("summary.singleEvent")}</Text>
          </View>
          <View style={styles.planPrice}>
            <Text style={styles.priceAmount}>{planPrice}</Text>
            <Text style={styles.priceCurrency}>{t("summary.currency")}</Text>
          </View>
        </View>

        <View style={styles.featuresSummary}>
          {billingType === "monthly" ? (
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
                {`${selectedPlan?.invites ?? selectedPlan?.limits?.maxInvitesPerEvent ?? 25} ${t("summary.invitesLabel")}`}
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

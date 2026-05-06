import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";

const MonthlyPlans = ({ plans, selectedPlan, onSelectPlan }) => {
  const { t, i18n } = useTranslation("plans");
  const isArabic = i18n.language === "ar";

  return (
    <View style={styles.container}>
      {plans.map((plan) => {
        const poolSize = plan.invitePool || plan.limits?.invitePool || 0;
        const price = plan.price || plan.pricing?.oneTime || 0;
        const compensationInvites = Math.floor(poolSize * 0.15);
        const isSelected = selectedPlan?.code === plan.code;
        const planName = isArabic
          ? plan.nameAr || t("billingTypes.monthly")
          : plan.nameEn || t("billingTypes.monthly");

        return (
          <TouchableOpacity
            key={plan.code}
            style={[styles.planCard, isSelected && styles.planCardSelected]}
            onPress={() => onSelectPlan(plan)}
            activeOpacity={0.8}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.planName}>{planName}</Text>
                <Text style={styles.durationNote}>
                  {t("monthlyPlan.durationNote")}
                </Text>
              </View>
              <View style={styles.priceTag}>
                <Text style={styles.currency}>{t("currency")}</Text>
                <Text style={[styles.price, isSelected && styles.priceSelected]}>
                  {price}
                </Text>
              </View>
            </View>

            {/* Pool Details */}
            <View style={styles.poolDetails}>
              {/* Invite Pool */}
              <View style={styles.poolItem}>
                <Ionicons name="people-outline" size={18} color="#C28E5C" />
                <View>
                  <Text style={styles.poolLabel}>{t("inviteSelector.poolLabel")}</Text>
                  <Text style={styles.poolValue}>
                    {poolSize} {t("inviteSelector.invites")}
                  </Text>
                </View>
              </View>

              {/* Compensation Invites */}
              <View style={styles.poolItem}>
                <Ionicons name="gift-outline" size={18} color="#C28E5C" />
                <View>
                  <Text style={styles.poolLabel}>{t("compensation.title")}</Text>
                  <Text style={styles.poolValue}>
                    {compensationInvites} {t("compensation.invites")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Features */}
            {plan.features && plan.features.length > 0 && (
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>{t("features.title")}</Text>
                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <View style={styles.checkIcon}>
                        <Ionicons name="checkmark" size={14} color="#C28E5C" />
                      </View>
                      <Text style={styles.featureText}>
                        {isArabic
                          ? feature.labelAr || feature.label || feature
                          : feature.labelEn || feature.label || feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Selected indicator */}
            {isSelected && (
              <View style={styles.selectedBadgeWrapper}>
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                  <Text style={styles.selectedText}>
                    {t("badges.selected")}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    gap: 16,
  },
  planCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  planCardSelected: {
    borderColor: "#C28E5C",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  planName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 17,
    color: "#2C2C2C",
    marginBottom: 4,
  },
  durationNote: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#656565",
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  currency: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: "#656565",
  },
  price: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    color: "#C28E5C",
  },
  priceSelected: {
    color: "#8A6541",
  },
  poolDetails: {
    backgroundColor: "#F5ECE4",
    borderRadius: 8,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  poolItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  poolLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: "#6B4E33",
    marginBottom: 2,
  },
  poolValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#6B4E33",
  },
  featuresSection: {
    marginBottom: 12,
  },
  featuresTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
    marginBottom: 10,
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F5ECE4",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#2C2C2C",
    lineHeight: 18,
  },
  selectedBadgeWrapper: {
    alignItems: "center",
    marginTop: 4,
  },
  selectedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8A6541",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  selectedText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
    color: "#FFF",
  },
});

export default MonthlyPlans;

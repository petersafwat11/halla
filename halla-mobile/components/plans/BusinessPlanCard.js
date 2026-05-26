import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "../../localization";
import { getLocalized, formatNumber } from "../../utils/locale";
import PlanDescription from "./PlanDescription";

const BusinessPlanCard = ({
  plan,
  compLabel,
  priceSuffix,
  selectedInviteCount,
  onSubscribe,
}) => {
  const { i18n } = useTranslation("plans");
  const locale = i18n.language;

  const planName = getLocalized(plan, "name", locale);
  const price = plan.pricing?.oneTime || 0;

  return (
    <View style={styles.planCard}>
      <Text style={styles.planName}>{planName}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceAmount}>{formatNumber(price, locale)}</Text>
        <Text style={styles.priceCurrency}>{priceSuffix}</Text>
      </View>

      <PlanDescription
        plan={plan}
        lang={locale}
        selectedInviteCount={selectedInviteCount}
      />

      <TouchableOpacity
        style={styles.subscribeBtn}
        onPress={() => onSubscribe(plan)}
        activeOpacity={0.8}
      >
        <Text style={styles.subscribeBtnText}>{compLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  planCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  planName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: "#2C2C2C",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  priceAmount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 28,
    color: "#C28E5C",
  },
  priceCurrency: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#8A6541",
    marginBottom: 4,
  },
  limitsBox: {
    backgroundColor: "#F5ECE4",
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  limitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  limitText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: "#6B4E33",
    flex: 1,
  },
  featuresList: {
    gap: 8,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#2C2C2C",
    flex: 1,
  },
  subscribeBtn: {
    backgroundColor: "#C28E5C",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  subscribeBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#FFF",
  },
});

export default BusinessPlanCard;

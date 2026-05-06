import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const EnterprisePlanCard = ({
  plan,
  compInvites,
  compLabel,
  validityLabel,
  currency,
  priceSuffix,
  invitesSuffix,
  compSuffix,
  whatsappLabel,
  setupIncluded,
  onSubscribe,
}) => {
  const planName = plan.nameAr || plan.nameEn || "";
  const badgeLabel = plan.badge?.labelAr || plan.badge?.labelEn || null;
  const price = plan.pricing?.oneTime || 0;
  const inviteCount = (plan.limits?.invitePool ?? plan.limits?.maxInvitesPerEvent) || 0;

  return (
    <View style={styles.planCard}>
      {badgeLabel && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      )}
      <Text style={styles.planName}>{planName}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceAmount}>{price.toLocaleString()}</Text>
        <Text style={styles.priceCurrency}>{priceSuffix}</Text>
      </View>
      <View style={styles.limitsBox}>
        <View style={styles.limitItem}>
          <Ionicons name="people-outline" size={16} color="#C28E5C" />
          <Text style={styles.limitText}>
            {inviteCount.toLocaleString()} {invitesSuffix}
          </Text>
        </View>
        <View style={styles.limitItem}>
          <Ionicons name="gift-outline" size={16} color="#C28E5C" />
          <Text style={styles.limitText}>
            {compInvites} {compSuffix}
          </Text>
        </View>
        <View style={styles.limitItem}>
          <Ionicons name="time-outline" size={16} color="#C28E5C" />
          <Text style={styles.limitText}>{validityLabel}</Text>
        </View>
        {whatsappLabel && (
          <View style={styles.limitItem}>
            <Ionicons name="logo-whatsapp" size={16} color="#C28E5C" />
            <Text style={styles.limitText}>{whatsappLabel}</Text>
          </View>
        )}
        {setupIncluded && (
          <View style={styles.limitItem}>
            <Ionicons name="checkmark-done-outline" size={16} color="#2A8C5B" />
            <Text style={styles.limitText}>{setupIncluded}</Text>
          </View>
        )}
      </View>
      {plan.features?.length > 0 && (
        <View style={styles.featuresList}>
          {plan.features.map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#2A8C5B" />
              <Text style={styles.featureText}>
                {f.labelAr || f.labelEn}
              </Text>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={styles.subscribeBtn}
        onPress={() => onSubscribe(plan)}
        activeOpacity={0.8}
      >
        <Text style={styles.subscribeBtnText}>
          {compLabel}
        </Text>
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
  badge: {
    backgroundColor: "#C28E5C",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  badgeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
    color: "#FFF",
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

export default EnterprisePlanCard;

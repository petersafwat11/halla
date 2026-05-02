import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const PlanCard = ({
  title,
  description,
  price,
  features = [],
  buttonText,
  borderColor = "#CEA57D",
  isCurrentPlan = false,
  onSubscribe,
  guestSelector,
  limits,
}) => {
  const { t } = useTranslation("plans");

  return (
    <View style={[styles.planCard, { borderBottomColor: borderColor }]}>
      {isCurrentPlan && (
        <View style={styles.currentPlanBadge}>
          <Text style={styles.currentPlanText}>{t("overview.currentPlanBadge")}</Text>
        </View>
      )}

      <View style={styles.planContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.description}>{description}</Text>

          {/* Guest Selector */}
          {guestSelector && (
            <View style={styles.guestSelector}>
              <TouchableOpacity style={styles.dropdown}>
                <Ionicons name="chevron-down" size={16} color="#767676" />
                <View style={styles.guestCount}>
                  <Text style={styles.guestNumber}>{guestSelector.count}</Text>
                  <Text style={styles.guestLabel}>
                    {" "}
                    {t("singleEvent.guestsLabel")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{price}</Text>
              <Text style={styles.currency}>﷼</Text>
            </View>
            <Text style={styles.period}>
              {guestSelector
                ? t("singleEvent.perEvent")
                : t("monthly.perMonth")}
            </Text>
          </View>
        </View>

        {/* Limits (for monthly plans) */}
        {limits && (
          <View style={styles.limitsSection}>
            <View style={styles.limitItem}>
              <Ionicons name="calendar-outline" size={16} color="#C28E5C" />
              <Text style={styles.limitText}>
                {limits.maxEventsPerMonth} {t("monthly.limits.eventsPerMonth")}
              </Text>
            </View>
            <View style={styles.limitItem}>
              <Ionicons name="people-outline" size={16} color="#C28E5C" />
              <Text style={styles.limitText}>
                {limits.maxGuestsPerEvent} {t("monthly.limits.guestsPerEvent")}
              </Text>
            </View>
          </View>
        )}

        {/* Features */}
        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={14} color="#C28E5C" />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Subscribe Button */}
      <TouchableOpacity
        style={[
          styles.subscribeButton,
          isCurrentPlan && styles.subscribeButtonDisabled,
        ]}
        onPress={onSubscribe}
        disabled={isCurrentPlan}
        activeOpacity={0.8}
      >
        <Text style={styles.subscribeButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  planCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    borderBottomWidth: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  currentPlanBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#8A6541",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 1,
  },
  currentPlanText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
    color: "#FFF",
  },
  planContent: {
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  titleSection: {
    marginBottom: 8,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: "#2C2C2C",
  },
  description: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: "#656565",
    marginBottom: 12,
  },
  guestSelector: {
    marginBottom: 12,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    backgroundColor: "#FFF",
    gap: 8,
    alignSelf: "flex-start",
  },
  guestCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  guestNumber: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
  },
  guestLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#2C2C2C",
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  price: {
    fontFamily: "Cairo_700Bold",
    fontSize: 28,
    color: "#2C2C2C",
  },
  currency: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    color: "#2C2C2C",
  },
  period: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
    color: "#656565",
    marginBottom: 4,
  },
  limitsSection: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F5ECE4",
    borderRadius: 8,
  },
  limitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  limitText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#6B4E33",
  },
  features: {
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
    fontSize: 13,
    color: "#2C2C2C",
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: "#C28E5C",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  subscribeButtonDisabled: {
    backgroundColor: "#E5E7EA",
  },
  subscribeButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#FFF",
  },
});

export default PlanCard;

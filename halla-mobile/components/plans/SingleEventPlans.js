import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";

const SingleEventPlans = ({ plans, selectedPlan, onSelectPlan }) => {
  const { t, i18n } = useTranslation("plans");
  const isArabic = i18n.language === "ar";

  // Invite count options from plans
  const guestOptions = plans
    .map((plan) => {
      const inviteCount = plan.invites ?? plan.limits?.maxInvitesPerEvent ?? 0;
      return {
        code: plan.code,
        guests: inviteCount,
        price: plan.price || plan.pricing?.oneTime || 0,
        plan: plan,
      };
    })
    .sort((a, b) => a.guests - b.guests);

  // Default to first option if no plan selected
  const [selectedGuests, setSelectedGuests] = useState(
    selectedPlan?.invites ||
      selectedPlan?.guests ||
      selectedPlan?.guestCount ||
      guestOptions[0]?.guests ||
      25,
  );

  // Get current plan based on selected invites
  const currentPlan =
    guestOptions.find((opt) => opt.guests === selectedGuests) ||
    guestOptions[0];

  // Calculate compensation invites (15% of invites)
  const inviteCount = currentPlan?.guests || selectedGuests;
  const compensationInvites = Math.floor(inviteCount * 0.15);

  // Update parent when guest count changes
  useEffect(() => {
    if (currentPlan?.plan) {
      onSelectPlan(currentPlan.plan);
    }
  }, [selectedGuests]);

  // All features — using locale-agnostic hardcoded labels (no old singleEvent.features.* keys exist)
  const getFeatures = () => [
    { icon: "phone-portrait-outline", text: t("features.sendInvites") },
    { icon: "logo-whatsapp", text: t("features.receiveInvites") },
    { icon: "qr-code-outline", text: t("features.scanEntry") },
    { icon: "swap-horizontal-outline", text: t("features.flexibleEntry") },
    { icon: "shield-checkmark-outline", text: t("features.gateKeeper") },
    { icon: "chatbubbles-outline", text: t("features.rsvpResponses") },
    { icon: "notifications-outline", text: t("features.autoReminders") },
    { icon: "people-outline", text: t("features.staffManagement") },
  ];

  return (
    <View style={styles.container}>
      {/* Plan Card */}
      <View style={styles.planCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.planTitle}>
            {isArabic
              ? currentPlan?.plan?.nameAr || (t("billingTypes.event"))
              : currentPlan?.plan?.nameEn || (t("billingTypes.event"))}
          </Text>
          <View style={styles.priceTag}>
            <Text style={styles.currency}>{t("currency")}</Text>
            <Text style={styles.price}>{currentPlan?.price || 0}</Text>
          </View>
        </View>

        {/* Invite Count Selector */}
        <View style={styles.guestSelector}>
          <Text style={styles.selectorLabel}>
            {t("inviteSelector.label")}
          </Text>
          <View style={styles.guestOptions}>
            {guestOptions.map((option) => (
              <TouchableOpacity
                key={option.code}
                style={[
                  styles.guestOption,
                  selectedGuests === option.guests && styles.guestOptionActive,
                ]}
                onPress={() => setSelectedGuests(option.guests)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.guestOptionText,
                    selectedGuests === option.guests &&
                      styles.guestOptionTextActive,
                  ]}
                >
                  {option.guests}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.selectorHint}>
            {`${guestOptions[0]?.guests || 25}+ ${t("inviteSelector.invites")}`}
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>{t("features.title")}</Text>
          <View style={styles.featuresList}>
            {getFeatures().map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={14} color="#C28E5C" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Compensation Invites Section */}
        <View style={styles.compensationSection}>
          <View style={styles.compensationHeader}>
            <Ionicons name="gift-outline" size={20} color="#C28E5C" />
            <Text style={styles.compensationTitle}>
              {t("compensation.title")}
            </Text>
          </View>
          <View style={styles.compensationValue}>
            <Text style={styles.compensationNumber}>{compensationInvites}</Text>
            <Text style={styles.compensationLabel}>
              {" "}
              {t("compensation.invites")}
            </Text>
          </View>
        </View>

        {/* Selected Badge */}
        {selectedPlan && (
          <View style={styles.selectedBadgeWrapper}>
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark" size={12} color="#FFF" />
              <Text style={styles.selectedText}>
                {t("badges.selected")}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
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
    marginBottom: 20,
  },
  planTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#2C2C2C",
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
    fontSize: 22,
    color: "#C28E5C",
  },
  guestSelector: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#2C2C2C",
    marginBottom: 12,
  },
  guestOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  guestOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EA",
    backgroundColor: "#FFF",
    minWidth: 70,
    alignItems: "center",
  },
  guestOptionActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  guestOptionText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#2C2C2C",
  },
  guestOptionTextActive: {
    color: "#FFF",
  },
  selectorHint: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: "#656565",
    lineHeight: 16,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
    marginBottom: 12,
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
  compensationSection: {
    backgroundColor: "#F5ECE4",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  compensationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  compensationTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#6B4E33",
  },
  compensationValue: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  compensationNumber: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    color: "#C28E5C",
  },
  compensationLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#6B4E33",
  },
  compensationNote: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: "#6B4E33",
    lineHeight: 16,
  },
  selectedBadgeWrapper: {
    alignItems: "center",
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

export default SingleEventPlans;

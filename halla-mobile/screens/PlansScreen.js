import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from "../localization";

import SingleEventPlans from "../components/plans/SingleEventPlans";
import MonthlyPlans from "../components/plans/MonthlyPlans";
import TopBar from "../components/plans/TopBar";
import { useHostPlans } from "../hooks";

const PlansScreen = () => {
  const { t, i18n } = useTranslation("plans");
  const navigation = useNavigation();
  const toast = useToast();
  const isArabic = i18n.language === "ar";

  // State
  const [planFamily, setPlanFamily] = useState("basic");
  const [billingType, setBillingType] = useState("event");
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Fetch plans using React Query
  const { data: response, isLoading: loading, error } = useHostPlans();

  // Backend returns { status, data: { basic: { event: [], monthly: [] }, premium: { event: [], monthly: [] } } }
  const activePlans = response?.data?.[planFamily]?.[billingType] || [];

  // Update selected plan when family/type changes or data loads
  useEffect(() => {
    if (activePlans.length > 0) {
      setSelectedPlan(activePlans[0]);
    } else {
      setSelectedPlan(null);
    }
  }, [planFamily, billingType, activePlans.length]);

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      toast.error(t("errors.loadFailed"));
    }
  }, [error]);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const handleProceedToSummary = () => {
    if (!selectedPlan) {
      toast.error(t("errors.selectPlan"));
      return;
    }

    navigation.navigate("PlansSummary", {
      selectedPlan: {
        ...selectedPlan,
        price: selectedPlan?.pricing?.oneTime || selectedPlan?.price,
        planFamily,
        billingType,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <TopBar title={isArabic ? "الباقات" : "Plans"} showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C28E5C" />
          <Text style={styles.loadingText}>{t("loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopBar title={isArabic ? "الباقات" : "Plans"} showBack={true} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Family Tabs — basic / premium */}
        <View style={styles.planTypeTabs}>
          {["basic", "premium"].map((family) => (
            <TouchableOpacity
              key={family}
              style={[
                styles.planTypeTab,
                planFamily === family && styles.planTypeTabActive,
              ]}
              onPress={() => {
                setPlanFamily(family);
                setSelectedPlan(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={family === "basic" ? "calendar-outline" : "star-outline"}
                size={20}
                color={planFamily === family ? "#FFF" : "#C28E5C"}
              />
              <Text
                style={[
                  styles.planTypeTabText,
                  planFamily === family && styles.planTypeTabTextActive,
                ]}
              >
                {t(`planFamilies.${family}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Billing Type Pills — event / monthly */}
        <View style={styles.billingPills}>
          {["event", "monthly"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.billingPill,
                billingType === type && styles.billingPillActive,
              ]}
              onPress={() => {
                setBillingType(type);
                setSelectedPlan(null);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.billingPillText,
                  billingType === type && styles.billingPillTextActive,
                ]}
              >
                {t(`billingTypes.${type}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Billing type description */}
        <Text style={styles.billingDescription}>
          {t(`billingTypeDescriptions.${billingType}`)}
        </Text>

        {/* Plan Display */}
        {activePlans.length > 0 ? (
          billingType === "event" ? (
            <SingleEventPlans
              plans={activePlans}
              selectedPlan={selectedPlan}
              onSelectPlan={handlePlanSelect}
            />
          ) : (
            <MonthlyPlans
              plans={activePlans}
              selectedPlan={selectedPlan}
              onSelectPlan={handlePlanSelect}
              t={t}
            />
          )
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isArabic ? "لا توجد باقات متاحة" : "No plans available"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={handleProceedToSummary}
          activeOpacity={0.8}
        >
          <Text style={styles.proceedButtonText}>
            {t("buttons.subscribeNow")}
          </Text>
          <Ionicons
            name={isArabic ? "chevron-back" : "chevron-forward"}
            size={20}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#C28E5C",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F4EF",
    gap: 12,
  },
  loadingText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#656565",
  },
  content: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  planTypeTabs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  planTypeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E5E7EA",
  },
  planTypeTabActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  planTypeTabText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: "#2C2C2C",
  },
  planTypeTabTextActive: {
    color: "#FFF",
  },
  billingPills: {
    flexDirection: "row",
    backgroundColor: "#F5ECE4",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  billingPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  billingPillActive: {
    backgroundColor: "#C28E5C",
  },
  billingPillText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: "#6B4E33",
  },
  billingPillTextActive: {
    color: "#FFF",
  },
  billingDescription: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#656565",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#656565",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  proceedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 14,
    borderRadius: 10,
  },
  proceedButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
});

export default PlansScreen;

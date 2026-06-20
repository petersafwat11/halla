import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import { useTranslation } from "../../localization";
import { useBusinessPlans } from "../../hooks";
import TopBar from "../../components/plans/TopBar";
import BusinessPlanCard from "../../components/plans/BusinessPlanCard";

const WhitelabelPlansScreen = () => {
  const { t } = useTranslation("plans");
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState("event");
  const [selectedEventInvites, setSelectedEventInvites] = useState(null);

  const { data, isLoading, error } = useBusinessPlans();

  const plansData = useMemo(() => {
    const d = data?.data || data;
    return {
      event:     d?.event     || [],
      quarterly: d?.quarterly?.[0] || null,
      annual:    d?.annual?.[0]    || null,
    };
  }, [data]);

  const { event: eventPlans, quarterly: quarterlyPlan, annual: annualPlan } = plansData;

  useEffect(() => {
    if (eventPlans.length > 0 && selectedEventInvites === null) {
      setSelectedEventInvites(eventPlans[0].limits?.invitePool);
    }
  }, [eventPlans, selectedEventInvites]);

  const selectedEventPlan =
    eventPlans.find((p) => p.limits?.invitePool === selectedEventInvites) ||
    eventPlans[0] ||
    null;

  const handleSubscribe = useCallback((plan) => {
    navigation.navigate("WhitelabelPlansSummary", {
      selectedPlan: { ...plan, price: plan.pricing?.oneTime || 0 },
    });
  }, [navigation]);

  const handleTabPress = useCallback((key) => {
    setActiveTab(key);
  }, []);

  const TABS = [
    { key: "event",     label: t("tabs.event") },
    { key: "quarterly", label: t("tabs.quarterly") },
    { key: "annual",    label: t("tabs.annual") },
  ];

  const title = t("pageTitle");

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={title} showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C28E5C" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={title} showBack />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#E5E7EA" />
          <Text style={styles.errorText}>
            {t("errors.loadFailed")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={title} showBack />

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "event" && eventPlans.length > 0 && (
            <View>
              <Text style={styles.sectionHint}>
                {t("eventTab.hint")}
              </Text>

              <View style={styles.inviteRow}>
                {eventPlans.map((p) => {
                  const inv = p.limits?.invitePool || 0;
                  const isActive = selectedEventInvites === inv;
                  return (
                    <TouchableOpacity
                      key={p.code}
                      style={[styles.inviteBtn, isActive && styles.inviteBtnActive]}
                      onPress={() => setSelectedEventInvites(inv)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.inviteBtnText, isActive && styles.inviteBtnTextActive]}>
                        {inv}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedEventPlan && (
                <BusinessPlanCard
                  plan={selectedEventPlan}
                  compLabel={t("buttons.subscribeNow")}
                  priceSuffix={t("eventTab.priceSuffix")}
                  selectedInviteCount={selectedEventInvites}
                  onSubscribe={handleSubscribe}
                />
              )}
            </View>
          )}

          {activeTab === "quarterly" && (
            <View>
              <Text style={styles.sectionHint}>
                {t("quarterlyTab.hint")}
              </Text>
              {quarterlyPlan ? (
                <BusinessPlanCard
                  plan={quarterlyPlan}
                  compLabel={t("buttons.subscribeNow")}
                  priceSuffix={t("quarterlyTab.priceSuffix")}
                  onSubscribe={handleSubscribe}
                />
              ) : (
                <Text style={styles.noPlansText}>
                  {t("quarterlyTab.noPlans")}
                </Text>
              )}
            </View>
          )}

          {activeTab === "annual" && (
            <View>
              <Text style={styles.sectionHint}>
                {t("annualTab.hint")}
              </Text>
              {annualPlan ? (
                <BusinessPlanCard
                  plan={annualPlan}
                  compLabel={t("buttons.subscribeNow")}
                  priceSuffix={t("annualTab.priceSuffix")}
                  onSubscribe={handleSubscribe}
                />
              ) : (
                <Text style={styles.noPlansText}>
                  {t("annualTab.noPlans")}
                </Text>
              )}
            </View>
          )}

          <Text style={styles.contactNote}>
            {t("contactNote")}
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: "#C28E5C" },
  container:  { flex: 1, backgroundColor: "#F9F4EF" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9F4EF",
  },
  errorText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#656565",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EA",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#F5ECE4",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  tabText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
    color: "#6B4E33",
  },
  tabTextActive: {
    color: "#FFF",
  },
  scroll:         { flex: 1 },
  scrollContent:  { padding: 20, paddingBottom: 40 },
  sectionHint: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#656565",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  selectorLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#2C2C2C",
    marginBottom: 10,
  },
  inviteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  inviteBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EA",
    backgroundColor: "#FFF",
    minWidth: 64,
    alignItems: "center",
  },
  inviteBtnActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  inviteBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
  },
  inviteBtnTextActive: { color: "#FFF" },
  noPlansText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#656565",
    textAlign: "center",
    paddingVertical: 40,
  },
  contactNote: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#656565",
    textAlign: "center",
    marginTop: 8,
  },
});

export default WhitelabelPlansScreen;

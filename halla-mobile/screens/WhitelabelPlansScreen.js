import React, { useState, useMemo } from "react";
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
import { useTranslation } from "../localization";
import { useAdminEnterprisePlans } from "../hooks";
import TopBar from "../components/plans/TopBar";

const COMPENSATION_PCT = 0.15;
const comp = (n) => Math.floor(n * COMPENSATION_PCT);

const WhitelabelPlansScreen = () => {
  const { t, currentLanguage } = useTranslation("plans");
  const navigation = useNavigation();
  const isArabic = currentLanguage === "ar";

  const [activeTab, setActiveTab] = useState("event");
  const [selectedEventInvites, setSelectedEventInvites] = useState(null);

  const { data, isLoading, error } = useAdminEnterprisePlans();

  const plansData = useMemo(() => {
    const d = data?.data || data;
    return {
      event:     d?.event     || [],
      quarterly: d?.quarterly?.[0] || null,
      annual:    d?.annual?.[0]    || null,
    };
  }, [data]);

  const { event: eventPlans, quarterly: quarterlyPlan, annual: annualPlan } = plansData;

  // Auto-select first event invite count
  useMemo(() => {
    if (eventPlans.length > 0 && selectedEventInvites === null) {
      setSelectedEventInvites(eventPlans[0].limits?.maxInvitesPerEvent);
    }
  }, [eventPlans]);

  const selectedEventPlan =
    eventPlans.find((p) => p.limits?.maxInvitesPerEvent === selectedEventInvites) ||
    eventPlans[0] ||
    null;

  const handleSubscribe = (plan) => {
    navigation.navigate("WhitelabelPlansSummary", {
      selectedPlan: { ...plan, price: plan.pricing?.oneTime || 0 },
    });
  };

  const TABS = [
    { key: "event",     labelAr: "لكل مناسبة",   labelEn: "Per Event"     },
    { key: "quarterly", labelAr: "رصيد ٣ أشهر",  labelEn: "3-Month Pool"  },
    { key: "annual",    labelAr: "رصيد سنوي",     labelEn: "Annual Pool"   },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={isArabic ? "باقات الأعمال" : "Business Plans"} showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C28E5C" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={isArabic ? "باقات الأعمال" : "Business Plans"} showBack />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#E5E7EA" />
          <Text style={styles.errorText}>
            {isArabic ? "فشل في تحميل الباقات" : "Failed to load plans"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderFeatures = (plan) => {
    if (!plan?.features?.length) return null;
    return (
      <View style={styles.featuresList}>
        {plan.features.map((f, i) => (
          <View key={i} style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#2A8C5B" />
            <Text style={styles.featureText}>
              {isArabic ? f.labelAr : f.labelEn}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderContactBtn = (plan) => (
    <TouchableOpacity
      style={styles.subscribeBtn}
      onPress={() => handleSubscribe(plan)}
      activeOpacity={0.8}
    >
      <Text style={styles.subscribeBtnText}>
        {isArabic ? "تواصل معنا" : "Contact Us"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={isArabic ? "باقات الأعمال" : "Business Plans"} showBack />

        {/* Tab row */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {isArabic ? tab.labelAr : tab.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ PER EVENT ═══ */}
          {activeTab === "event" && (
            <View>
              <Text style={styles.sectionHint}>
                {isArabic
                  ? "باقة واحدة لكل مناسبة — صالحة ٩٠ يوماً · رسوم إعداد ١٢٠٠ ر.س (مرة واحدة)"
                  : "1 event per plan — valid 90 days · 1,200 SAR one-time setup fee"}
              </Text>

              {/* Invite count selector */}
              <Text style={styles.selectorLabel}>
                {isArabic ? "اختر عدد الدعوات" : "Select invite count"}
              </Text>
              <View style={styles.inviteRow}>
                {eventPlans.map((p) => {
                  const inv = p.limits?.maxInvitesPerEvent || 0;
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

              {/* Selected plan card */}
              {selectedEventPlan && (
                <View style={styles.planCard}>
                  {selectedEventPlan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {isArabic ? selectedEventPlan.badge.labelAr : selectedEventPlan.badge.labelEn}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.planName}>
                    {isArabic ? selectedEventPlan.nameAr : selectedEventPlan.nameEn}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceAmount}>
                      {(selectedEventPlan.pricing?.oneTime || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.priceCurrency}>
                      {isArabic ? " ر.س / مناسبة" : " SAR / event"}
                    </Text>
                  </View>
                  <View style={styles.limitsBox}>
                    <View style={styles.limitItem}>
                      <Ionicons name="people-outline" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {selectedEventPlan.limits?.maxInvitesPerEvent}{" "}
                        {isArabic ? "دعوة / مناسبة" : "invites / event"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="gift-outline" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {comp(selectedEventPlan.limits?.maxInvitesPerEvent || 0)}{" "}
                        {isArabic ? "دعوة تعويضية (١٥٪)" : "compensation invites (15%)"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="time-outline" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {isArabic ? "صالحة ٩٠ يوماً" : "Valid 90 days"}
                      </Text>
                    </View>
                  </View>
                  {renderFeatures(selectedEventPlan)}
                  {renderContactBtn(selectedEventPlan)}
                </View>
              )}
            </View>
          )}

          {/* ═══ QUARTERLY POOL ═══ */}
          {activeTab === "quarterly" && (
            <View>
              <Text style={styles.sectionHint}>
                {isArabic
                  ? "رصيد دعوات مشترك لمناسبات غير محدودة — ٩٠ يوماً"
                  : "Shared invite pool for unlimited events — 90 days"}
              </Text>
              {quarterlyPlan ? (
                <View style={styles.planCard}>
                  {quarterlyPlan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {isArabic ? quarterlyPlan.badge.labelAr : quarterlyPlan.badge.labelEn}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.planName}>
                    {isArabic ? quarterlyPlan.nameAr : quarterlyPlan.nameEn}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceAmount}>
                      {(quarterlyPlan.pricing?.oneTime || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.priceCurrency}>
                      {isArabic ? " ر.س / ٣ أشهر" : " SAR / 3 months"}
                    </Text>
                  </View>
                  <View style={styles.limitsBox}>
                    <View style={styles.limitItem}>
                      <Ionicons name="people-outline" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {(quarterlyPlan.limits?.invitePool || 0).toLocaleString()}{" "}
                        {isArabic ? "دعوة (رصيد مشترك)" : "invites (shared pool)"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="gift-outline" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {comp(quarterlyPlan.limits?.invitePool || 0)}{" "}
                        {isArabic ? "دعوة تعويضية (١٥٪)" : "compensation invites (15%)"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="time-outline" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {isArabic ? "صالحة ٩٠ يوماً" : "Valid 90 days"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="logo-whatsapp" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {isArabic ? "٣ قوالب واتساب مخصصة" : "3 custom WhatsApp templates"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="checkmark-done-outline" size={16} color="#2A8C5B" />
                      <Text style={styles.limitText}>
                        {isArabic ? "رسوم الإعداد مدرجة" : "Setup fee included"}
                      </Text>
                    </View>
                  </View>
                  {renderFeatures(quarterlyPlan)}
                  {renderContactBtn(quarterlyPlan)}
                </View>
              ) : (
                <Text style={styles.noPlansText}>
                  {isArabic ? "لا توجد باقة ربع سنوية" : "No quarterly plan available"}
                </Text>
              )}
            </View>
          )}

          {/* ═══ ANNUAL POOL ═══ */}
          {activeTab === "annual" && (
            <View>
              <Text style={styles.sectionHint}>
                {isArabic
                  ? "رصيد دعوات مشترك لمناسبات غير محدودة — ٣٦٥ يوماً"
                  : "Shared invite pool for unlimited events — 365 days"}
              </Text>
              {annualPlan ? (
                <View style={styles.planCard}>
                  {annualPlan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {isArabic ? annualPlan.badge.labelAr : annualPlan.badge.labelEn}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.planName}>
                    {isArabic ? annualPlan.nameAr : annualPlan.nameEn}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceAmount}>
                      {(annualPlan.pricing?.oneTime || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.priceCurrency}>
                      {isArabic ? " ر.س / سنة" : " SAR / year"}
                    </Text>
                  </View>
                  <View style={styles.limitsBox}>
                    <View style={styles.limitItem}>
                      <Ionicons name="people-outline" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {(annualPlan.limits?.invitePool || 0).toLocaleString()}{" "}
                        {isArabic ? "دعوة (رصيد مشترك)" : "invites (shared pool)"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="gift-outline" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {comp(annualPlan.limits?.invitePool || 0)}{" "}
                        {isArabic ? "دعوة تعويضية (١٥٪)" : "compensation invites (15%)"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="time-outline" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {isArabic ? "صالحة ٣٦٥ يوماً" : "Valid 365 days"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="logo-whatsapp" size={16} color="#C28E5C" />
                      <Text style={styles.limitText}>
                        {isArabic ? "٥ قوالب واتساب مخصصة" : "5 custom WhatsApp templates"}
                      </Text>
                    </View>
                    <View style={styles.limitItem}>
                      <Ionicons name="checkmark-done-outline" size={16} color="#2A8C5B" />
                      <Text style={styles.limitText}>
                        {isArabic ? "رسوم الإعداد مدرجة" : "Setup fee included"}
                      </Text>
                    </View>
                  </View>
                  {renderFeatures(annualPlan)}
                  {renderContactBtn(annualPlan)}
                </View>
              ) : (
                <Text style={styles.noPlansText}>
                  {isArabic ? "لا توجد باقة سنوية" : "No annual plan available"}
                </Text>
              )}
            </View>
          )}

          <Text style={styles.contactNote}>
            {isArabic
              ? "سيتواصل معك فريقنا لإتمام عملية الدفع."
              : "Our team will contact you to complete payment."}
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

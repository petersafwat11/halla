import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";

const FEATURE_MAP = {
  hasInAppInvites: { icon: "phone-portrait-outline", labelAr: "إرسال الدعوات من التطبيق", labelEn: "In-App Invites" },
  hasWhatsAppInvites: { icon: "logo-whatsapp", labelAr: "دعوات واتساب", labelEn: "WhatsApp Invites" },
  hasSMSInvites: { icon: "chatbox-outline", labelAr: "دعوات رسائل نصية", labelEn: "SMS Invites" },
  hasQRCode: { icon: "qr-code-outline", labelAr: "رمز QR للدخول", labelEn: "QR Code Entry" },
  hasQRScanning: { icon: "scan-outline", labelAr: "مسح QR", labelEn: "QR Scanning" },
  hasFlexibleEntryMode: { icon: "options-outline", labelAr: "وضع دخول مرن", labelEn: "Flexible Entry Mode" },
  hasStaffCheckIn: { icon: "people-outline", labelAr: "إدارة الموظفين", labelEn: "Staff Check-in" },
  hasStaffAssignment: { icon: "shield-outline", labelAr: "تعيين فريق العمل", labelEn: "Staff Assignment" },
  hasRSVPTracking: { icon: "chatbubbles-outline", labelAr: "تتبع الحضور", labelEn: "RSVP Tracking" },
  hasAutoReminders: { icon: "notifications-outline", labelAr: "تذكيرات تلقائية", labelEn: "Auto Reminders" },
  hasEmailNotifications: { icon: "mail-outline", labelAr: "إشعارات بريد إلكتروني", labelEn: "Email Notifications" },
  hasCompensationInvites: { icon: "gift-outline", labelAr: "دعوات تعويضية", labelEn: "Compensation Invites" },
  hasBasicTemplates: { icon: "calendar-outline", labelAr: "قوالب أساسية", labelEn: "Basic Templates" },
};

const getInviteValue = (plan, billingType) => {
  if (billingType === "monthly") return plan.invitePool;
  return plan.invites || plan.limits?.maxInvitesPerEvent;
};

const HostPlanCard = ({
  planFamily,
  isPopular = false,
  plans = [],
  billingType,
  selectedInvites,
  onInviteChange,
  compensationCount = 0,
  onSubscribe,
}) => {
  const { t, i18n } = useTranslation("plans");
  const isArabic = i18n.language === "ar";

  const matchedPlan = useMemo(
    () =>
      plans.find((p) => getInviteValue(p, billingType) === selectedInvites) ||
      plans[0] ||
      null,
    [plans, billingType, selectedInvites]
  );

  const features = useMemo(() => {
    const featuresObj = matchedPlan?.features;
    if (!featuresObj || Array.isArray(featuresObj)) return featuresObj || [];
    return Object.entries(FEATURE_MAP)
      .filter(([key]) => featuresObj[key])
      .map(([, val]) => val);
  }, [matchedPlan]);

  const price = matchedPlan?.price || 0;

  return (
    <View style={[styles.card, isPopular && styles.cardPopular]}>
      {isPopular ? (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>
            {t(`planFamilies.${planFamily}`)}
          </Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={styles.cardTop}>
        <View style={styles.titleSection}>
          <Text style={styles.cardName}>{t(`planFamilies.${planFamily}`)}</Text>
          <Text style={styles.cardDesc}>
            {t(`planFamilyDescriptions.${planFamily}`)}
          </Text>
        </View>
        <View style={styles.priceWrap}>
          <View style={styles.priceRow}>
            <Text style={styles.priceNum}>{price.toLocaleString()}</Text>
            <Text style={styles.priceCur}>{t("currency")}</Text>
          </View>
          <Text style={styles.pricePer}>
            {billingType === "monthly"
              ? t("billingTypeLabels.monthly")
              : t("billingTypeLabels.event")}
          </Text>
        </View>
      </View>

      {/* Selector */}
      <View style={styles.selectorWrap}>
        <Text style={styles.selectorLabel}>
          {billingType === "monthly"
            ? t("inviteSelector.poolLabel")
            : t("inviteSelector.label")}
        </Text>
        <View style={styles.guestTrack}>
          {plans.map((plan) => {
            const value = getInviteValue(plan, billingType);
            const active = selectedInvites === value;
            return (
              <TouchableOpacity
                key={plan.code}
                style={[styles.guestBtn, active && styles.guestBtnActive]}
                onPress={() => onInviteChange?.(value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.guestNum, active && styles.guestNumActive]}
                >
                  {value}
                </Text>
                <Text
                  style={[styles.guestUnit, active && styles.guestUnitActive]}
                >
                  {t("inviteSelector.invites")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Validity note */}
      <View style={styles.validityNote}>
        <Text style={styles.validityNoteText}>
          {billingType === "monthly"
            ? t("billingTypeDescriptions.monthly")
            : t("billingTypeDescriptions.event")}
        </Text>
      </View>

      {/* Features */}
      {features.length > 0 ? (
        <View style={styles.featuresWrap}>
          <Text style={styles.featuresTitle}>{t("features.title")}</Text>
          <View style={styles.featuresGrid}>
            {features.map((f, i) => (
              <View key={i} style={styles.featureItem}>
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={colors.success[500]}
                />
                <Text style={styles.featureText} numberOfLines={2}>
                  {isArabic ? f.labelAr : f.labelEn}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Compensation */}
      <View style={styles.compensation}>
        <Ionicons
          name="gift-outline"
          size={20}
          color={colors.primary[500]}
        />
        <View style={styles.compensationContent}>
          <Text style={styles.compensationTitle}>
            {t("compensation.title")}
          </Text>
          <Text style={styles.compensationValue}>
            {compensationCount} {t("compensation.invites")}
          </Text>
        </View>
      </View>

      {/* Subscribe */}
      <TouchableOpacity
        style={[styles.subscribeBtn, !matchedPlan && styles.subscribeBtnDisabled]}
        onPress={() => matchedPlan && onSubscribe?.(matchedPlan)}
        disabled={!matchedPlan}
        activeOpacity={0.8}
      >
        <Text style={styles.subscribeBtnText}>{t("buttons.subscribeAction")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: "relative",
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[20],
    borderWidth: 2,
    borderColor: colors.primary[200],
    padding: spacing[20],
    marginBottom: spacing[16],
    shadowColor: colors.black[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPopular: {
    borderColor: colors.primary[500],
    shadowOpacity: 0.12,
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    backgroundColor: colors.primary[300],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: 999,
  },
  popularBadgeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[12],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    marginBottom: spacing[16],
  },
  titleSection: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.large,
    color: colors.secondary[700],
    marginBottom: spacing[4],
  },
  cardDesc: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[400],
    lineHeight: 18,
  },
  priceWrap: {
    alignItems: "flex-end",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  priceNum: {
    fontFamily: "Cairo_700Bold",
    fontSize: 26,
    color: colors.secondary[700],
    lineHeight: 28,
  },
  priceCur: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[700],
  },
  pricePer: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.caption.large,
    color: colors.natural[400],
    marginTop: 2,
  },
  selectorWrap: {
    marginBottom: spacing[16],
  },
  selectorLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[600],
    textAlign: "center",
    marginBottom: spacing[8],
  },
  guestTrack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  guestBtn: {
    flexBasis: "30%",
    flexGrow: 1,
    minWidth: 72,
    alignItems: "center",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius[12],
    borderWidth: 2,
    borderColor: colors.primary[200],
    backgroundColor: colors.natural[50],
  },
  guestBtnActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[100],
  },
  guestNum: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.primary[500],
    lineHeight: 20,
  },
  guestNumActive: {
    color: colors.primary[700],
  },
  guestUnit: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.caption.small,
    color: colors.accent[500],
  },
  guestUnitActive: {
    color: colors.primary[700],
  },
  validityNote: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: borderRadius[12],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    marginBottom: spacing[16],
    alignItems: "center",
  },
  validityNoteText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
    textAlign: "center",
  },
  featuresWrap: {
    marginBottom: spacing[16],
  },
  featuresTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
    marginBottom: spacing[8],
    textAlign: "center",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  featureItem: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[8],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius[8],
  },
  featureText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.caption.large,
    color: colors.secondary[600],
  },
  compensation: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    padding: spacing[12],
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius[12],
    marginBottom: spacing[12],
  },
  compensationContent: {
    flex: 1,
  },
  compensationTitle: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[600],
  },
  compensationValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.primary[500],
  },
  subscribeBtn: {
    paddingVertical: spacing[16],
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[500],
    alignItems: "center",
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  subscribeBtnDisabled: {
    opacity: 0.5,
  },
  subscribeBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.large,
    color: colors.natural[50],
  },
});

export default HostPlanCard;

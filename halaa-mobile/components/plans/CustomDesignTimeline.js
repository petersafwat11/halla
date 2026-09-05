import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DESIGN_FULFILLMENT_STATUS,
  DESIGN_FULFILLMENT_SEQUENCE,
  DESIGN_TEMPLATE_TIERS,
} from "@halaa/shared/constants/addons";
import {
  SUPPORT_SOURCE,
  buildSupportRequest,
} from "@halaa/shared/support";
import { formatDateTime, formatCurrency } from "@halaa/shared/utils/locale";
import { useTranslation, useLanguage } from "../../localization";
import StatusBadge from "../admin-dashboard/common/StatusBadge";
import { colors, typography, spacing, borderRadius } from "../../styles/tokens";

export default function CustomDesignTimeline({ addon }) {
  const { t } = useTranslation("plans");
  const { currentLanguage } = useLanguage();
  const isAr = currentLanguage === "ar";
  const locale = isAr ? "ar" : "en";

  if (!addon) return null;

  const currentStatus = addon.status;
  const fulfillment = addon.fulfillment || {};
  const isRefunded =
    currentStatus === "refunded" ||
    currentStatus === "refund_required" ||
    Boolean(addon.refundState);

  const tierMap = new Map();
  DESIGN_TEMPLATE_TIERS.forEach((tier) => {
    tierMap.set(tier.type, isAr ? tier.nameAr : tier.nameEn);
  });

  const tierDisplayName =
    tierMap.get(addon.templateType) ||
    addon.templateType ||
    t("addons.fulfillment.customDesignTitle", "تصميم دعوة مخصص");

  const orderId = addon.id || addon._id || "";
  const orderRef = orderId ? orderId.slice(-8).toUpperCase() : "";

  // Sequential status evaluation: never mark future steps complete
  const currentIndex = DESIGN_FULFILLMENT_SEQUENCE.indexOf(currentStatus);

  const steps = [
    {
      status: DESIGN_FULFILLMENT_STATUS.PAID,
      title: t("addons.fulfillment.stepPaid", "تم استلام الطلب"),
      timestamp: fulfillment.requestedAt || addon.createdAt,
    },
    {
      status: DESIGN_FULFILLMENT_STATUS.QUEUED,
      title: t("addons.fulfillment.stepQueued", "في قائمة الانتظار"),
      timestamp: fulfillment.queuedAt,
    },
    {
      status: DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
      title: t("addons.fulfillment.stepInProgress", "قيد التنفيذ"),
      timestamp: fulfillment.inProgressAt,
    },
    {
      status: DESIGN_FULFILLMENT_STATUS.FULFILLED,
      title: t("addons.fulfillment.stepFulfilled", "تم إكمال التصميم وتوصيله"),
      timestamp: fulfillment.fulfilledAt,
    },
  ];

  const handleSupportPress = async () => {
    const supportReq = buildSupportRequest({
      language: locale,
      source: SUPPORT_SOURCE.ADDON_FULFILLMENT,
      reference: { kind: "addon", value: String(orderId) },
    });
    try {
      if (supportReq.deepLinkUrl) {
        const canOpen = await Linking.canOpenURL(supportReq.deepLinkUrl);
        if (canOpen) {
          await Linking.openURL(supportReq.deepLinkUrl);
          return;
        }
      }
      if (supportReq.webUrl) {
        await Linking.openURL(supportReq.webUrl);
      }
    } catch {
      if (supportReq.webUrl) {
        Linking.openURL(supportReq.webUrl).catch(() => {});
      }
    }
  };

  return (
    <View style={styles.card} testID="custom-design-timeline-card">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.tierName}>{tierDisplayName}</Text>
          {orderRef ? (
            <Text style={styles.orderRef}>
              {t("addons.fulfillment.orderRef", "رقم المرجع")}: #{orderRef}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerBadges}>
          <StatusBadge status={currentStatus} size="small" />
          {addon.price != null ? (
            <Text style={styles.priceTag}>
              {formatCurrency(addon.price, locale, addon.currency || "SAR")}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Distinct Refund Banner */}
      {isRefunded ? (
        <View style={styles.refundBanner}>
          <Ionicons name="warning-outline" size={18} color="#b91c1c" />
          <Text style={styles.refundBannerText}>
            {currentStatus === "refunded"
              ? t("addons.fulfillment.refundedNotice", "تم استرداد هذا الطلب.")
              : t("addons.fulfillment.refundRequiredNotice", "هذا الطلب قيد مراجعة الاسترداد.")}
          </Text>
        </View>
      ) : null}

      {/* Expected Delivery Banner (only when present) */}
      {fulfillment.expectedDeliveryAt && !isRefunded ? (
        <View style={styles.deliveryBanner}>
          <Ionicons name="time-outline" size={16} color="#15803d" />
          <Text style={styles.deliveryText}>
            {t("addons.fulfillment.expectedDeliveryPrefix", "موعد التسليم المتوقع:")}{" "}
            <Text style={styles.deliveryHighlight}>
              {formatDateTime(fulfillment.expectedDeliveryAt, locale)}
            </Text>
          </Text>
        </View>
      ) : null}

      {/* Customer Note */}
      {fulfillment.customerNote ? (
        <View style={styles.noteBanner}>
          <Text style={styles.noteLabel}>
            {t("addons.fulfillment.designerNote", "ملاحظة فريق التصميم:")}
          </Text>
          <Text style={styles.noteText}>{fulfillment.customerNote}</Text>
        </View>
      ) : null}

      {/* Sequential Timeline: never marks future steps complete */}
      <View style={styles.timelineContainer}>
        {steps.map((step, idx) => {
          const isCompleted =
            !isRefunded &&
            currentIndex >= 0 &&
            (idx < currentIndex || (idx === currentIndex && currentStatus === DESIGN_FULFILLMENT_STATUS.FULFILLED));
          const isCurrent =
            !isRefunded &&
            idx === currentIndex &&
            currentStatus !== DESIGN_FULFILLMENT_STATUS.FULFILLED;

          let iconColor = colors.natural[400];
          let circleBg = colors.natural[150];
          if (isCompleted) {
            iconColor = "#ffffff";
            circleBg = "#16a34a";
          } else if (isCurrent) {
            iconColor = colors.primary[500];
            circleBg = colors.primary[50];
          }

          return (
            <View key={step.status} style={styles.timelineStep}>
              <View style={[styles.stepCircle, { backgroundColor: circleBg }]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={iconColor} />
                ) : isCurrent ? (
                  <Ionicons name="time" size={14} color={iconColor} />
                ) : (
                  <Text style={styles.stepNum}>{idx + 1}</Text>
                )}
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepTimestamp}>
                {step.timestamp ? formatDateTime(step.timestamp, locale) : "-"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Support action button with opaque addon reference */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.supportBtn}
          onPress={handleSupportPress}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
          <Text style={styles.supportBtnText}>
            {t("addons.fulfillment.contactSupport", "تواصل مع الدعم بخصوص هذا الطلب")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  headerInfo: {
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  tierName: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[900],
  },
  orderRef: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[500],
  },
  headerBadges: {
    alignItems: "flex-end",
    gap: spacing[4],
  },
  priceTag: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.medium,
    color: colors.primary[600],
  },
  refundBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: "#fee2e2",
    padding: spacing[10],
    borderRadius: borderRadius[8],
    marginTop: spacing[10],
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  refundBannerText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.medium,
    color: "#b91c1c",
    flex: 1,
  },
  deliveryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    backgroundColor: "#f0fdf4",
    padding: spacing[8],
    borderRadius: borderRadius[8],
    marginTop: spacing[8],
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  deliveryText: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.label.medium,
    color: "#15803d",
  },
  deliveryHighlight: {
    fontFamily: "Cairo_700Bold",
  },
  noteBanner: {
    backgroundColor: colors.natural[100],
    borderStartWidth: 4,
    borderStartColor: colors.primary[500],
    padding: spacing[8],
    borderRadius: borderRadius[4],
    marginTop: spacing[8],
  },
  noteLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.small,
    color: colors.secondary[800],
  },
  noteText: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[700],
    marginTop: 2,
  },
  timelineContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: spacing[16],
  },
  timelineStep: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  stepNum: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[500],
  },
  stepTitle: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.small,
    color: colors.secondary[900],
    textAlign: "center",
    lineHeight: 14,
  },
  stepTimestamp: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.xSmall,
    color: colors.natural[500],
    marginTop: 2,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: spacing[10],
    borderTopWidth: 1,
    borderTopColor: colors.natural[150],
  },
  supportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    backgroundColor: "#25d366",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[14],
    borderRadius: borderRadius[8],
  },
  supportBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.medium,
    color: "#ffffff",
  },
});
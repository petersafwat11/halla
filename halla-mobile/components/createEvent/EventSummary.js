import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useFormContext } from "react-hook-form";
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Icons
const PeopleIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Path
      d="M11.9997 4.77325C11.9597 4.76659 11.9131 4.76659 11.8731 4.77325C10.9531 4.73992 10.2197 3.98659 10.2197 3.05325C10.2197 2.09992 10.9864 1.33325 11.9397 1.33325C12.8931 1.33325 13.6597 2.10659 13.6597 3.05325C13.6531 3.98659 12.9197 4.73992 11.9997 4.77325Z"
      stroke="#C28E5C" strokeWidth="0.692308" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M11.313 9.62669C12.2263 9.78003 13.233 9.62003 13.9396 9.14669C14.8796 8.52003 14.8796 7.49336 13.9396 6.86669C13.2263 6.39336 12.2063 6.23336 11.293 6.39336"
      stroke="#C28E5C" strokeWidth="0.692308" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M3.98031 4.77325C4.02031 4.76659 4.06698 4.76659 4.10698 4.77325C5.02698 4.73992 5.76031 3.98659 5.76031 3.05325C5.76031 2.09992 4.99365 1.33325 4.04031 1.33325C3.08698 1.33325 2.32031 2.10659 2.32031 3.05325C2.32698 3.98659 3.06031 4.73992 3.98031 4.77325Z"
      stroke="#C28E5C" strokeWidth="0.692308" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M4.66663 9.62669C3.75329 9.78003 2.74663 9.62003 2.03996 9.14669C1.09996 8.52003 1.09996 7.49336 2.03996 6.86669C2.75329 6.39336 3.77329 6.23336 4.68663 6.39336"
      stroke="#C28E5C" strokeWidth="0.692308" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M8.0007 9.75323C7.9607 9.74657 7.91404 9.74657 7.87404 9.75323C6.95404 9.7199 6.2207 8.96657 6.2207 8.03323C6.2207 7.0799 6.98737 6.31323 7.9407 6.31323C8.89403 6.31323 9.6607 7.08657 9.6607 8.03323C9.65404 8.96657 8.9207 9.72657 8.0007 9.75323Z"
      stroke="#C28E5C" strokeWidth="0.692308" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M6.06047 11.8532C5.12047 12.4799 5.12047 13.5066 6.06047 14.1332C7.12714 14.8466 8.8738 14.8466 9.94047 14.1332C10.8805 13.5066 10.8805 12.4799 9.94047 11.8532C8.88047 11.1466 7.12714 11.1466 6.06047 11.8532Z"
      stroke="#C28E5C" strokeWidth="0.692308" strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const UserSearchIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Path
      d="M8.00033 7.99992C9.84127 7.99992 11.3337 6.50753 11.3337 4.66658C11.3337 2.82564 9.84127 1.33325 8.00033 1.33325C6.15938 1.33325 4.66699 2.82564 4.66699 4.66658C4.66699 6.50753 6.15938 7.99992 8.00033 7.99992Z"
      stroke="#C28E5C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M2.27344 14.6667C2.27344 12.0867 4.84012 10 8.00012 10"
      stroke="#C28E5C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M12.1333 14.2667C13.3115 14.2667 14.2667 13.3115 14.2667 12.1333C14.2667 10.9551 13.3115 10 12.1333 10C10.9551 10 10 10.9551 10 12.1333C10 13.3115 10.9551 14.2667 12.1333 14.2667Z"
      stroke="#C28E5C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"
    />
    <Path d="M14.6667 14.6667L14 14" stroke="#C28E5C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Path d="M5.33301 1.33325V3.33325" stroke="#C28E5C" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10.667 1.33325V3.33325" stroke="#C28E5C" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    <Path
      d="M10.6667 2.33325C12.8867 2.45325 14 3.29992 14 6.43325V10.5533C14 13.2999 13.3333 14.6733 10 14.6733H6C2.66667 14.6733 2 13.2999 2 10.5533V6.43325C2 3.29992 3.11333 2.45992 5.33333 2.33325H10.6667Z"
      stroke="#C28E5C" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const LocationIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Path
      d="M7.99992 8.95321C9.14867 8.95321 10.0799 8.02197 10.0799 6.87321C10.0799 5.72446 9.14867 4.79321 7.99992 4.79321C6.85117 4.79321 5.91992 5.72446 5.91992 6.87321C5.91992 8.02197 6.85117 8.95321 7.99992 8.95321Z"
      stroke="#C28E5C"
    />
    <Path
      d="M2.41379 5.65992C3.72712 -0.113413 12.2805 -0.106746 13.5871 5.66659C14.3538 9.05325 12.2471 11.9199 10.4005 13.6933C9.06046 14.9866 6.94046 14.9866 5.59379 13.6933C3.75379 11.9199 1.64712 9.04659 2.41379 5.65992Z"
      stroke="#C28E5C"
    />
  </Svg>
);

const EventSummary = () => {
  const { watch, setValue } = useFormContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const formData = watch();
  const eventName = formData.eventName || "—";
  const eventType = formData.eventType || "wedding";
  const guestCount = formData.guestList?.length || 0;
  const moderatorCount = formData.staffList?.length || 0;
  const eventDate = formData.eventDate;
  const eventTime = formData.eventTime || "";
  const location = formData.address?.address || "";
  const description = formData.description || formData.invitationMessage || "";
  const templateImage = formData.templateImage || null;
  const selectedTemplate = formData.selectedTemplate || null;
  const confirmReviewed = formData.confirmReviewed || false;

  // Invitation message: prefer WhatsApp template body, fallback to invitation message
  const invitationText =
    selectedTemplate?.bodyText || formData.invitationMessage || "";

  const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    const arabicMonths = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];
    return `${d.getDate()} ${arabicMonths[d.getMonth()]}${eventTime ? " , " + eventTime : ""}`;
  };

  const getEventTypeLabel = () => {
    const types = {
      wedding: "حفل زفاف",
      birthday: "عيد ميلاد",
      graduation: "تخرج",
      meeting: "اجتماع",
      conference: "مؤتمر",
      other: "مناسبة",
    };
    return types[eventType] || "مناسبة";
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim }}>

        {/* Event Header */}
        <View style={styles.eventHeader}>
          <Text style={styles.eventTypeLabel}>{getEventTypeLabel()}</Text>
          <Text style={styles.eventName}>{eventName}</Text>
        </View>

        {/* Metrics Grid — 2×2, no collapsing */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsGrid}>
            {/* Guests */}
            <View style={styles.metricItem}>
              <View style={styles.iconContainer}>
                <PeopleIcon />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>الضيوف</Text>
                <Text style={styles.metricValue}>{guestCount}</Text>
              </View>
            </View>

            {/* Moderators */}
            <View style={styles.metricItem}>
              <View style={styles.iconContainer}>
                <UserSearchIcon />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>المشرفين</Text>
                <Text style={styles.metricValue}>{moderatorCount}</Text>
              </View>
            </View>

            {/* Date/Time */}
            <View style={styles.metricItem}>
              <View style={styles.iconContainer}>
                <CalendarIcon />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>التوقيت</Text>
                <Text style={styles.metricValue} numberOfLines={2}>
                  {formatDate(eventDate)}
                </Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.metricItem}>
              <View style={styles.iconContainer}>
                <LocationIcon />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>العنوان</Text>
                <Text style={styles.metricValue} numberOfLines={2}>
                  {location || "—"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Invitation Preview */}
        <View style={styles.invitationSection}>
          <Text style={styles.sectionTitle}>معاينة الدعوة</Text>

          {/* WhatsApp-style bubble */}
          <View style={styles.waBubbleWrapper}>
            <View style={styles.waBubble}>
              {/* Image */}
              {templateImage ? (
                <Image
                  source={{ uri: templateImage }}
                  style={styles.waImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.waImagePlaceholder}>
                  <Text style={styles.waPlaceholderEmoji}>🎉</Text>
                  <Text style={styles.waPlaceholderText}>
                    {selectedTemplate ? "قالب WhatsApp" : "لم يتم اختيار صورة"}
                  </Text>
                </View>
              )}

              {/* Message content */}
              <View style={styles.waBody}>
                <Text style={styles.waEventName}>{eventName}</Text>

                {invitationText ? (
                  <Text style={styles.waMessage}>{invitationText}</Text>
                ) : (
                  <Text style={styles.waMessageEmpty}>
                    لم يتم اختيار قالب الرسالة بعد — يرجى اختيار قالب في الخطوة السابقة
                  </Text>
                )}

                {selectedTemplate && (
                  <View style={styles.waTemplateBadge}>
                    <Text style={styles.waTemplateBadgeText}>
                      ✓ {selectedTemplate.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action row */}
              <View style={styles.waActions}>
                <View style={styles.waAction}>
                  <Text style={styles.waActionTextPrimary}>سأحضر</Text>
                </View>
                <View style={styles.waActionDivider} />
                <View style={styles.waAction}>
                  <Text style={styles.waActionText}>سأعتذر</Text>
                </View>
                <View style={styles.waActionDivider} />
                <View style={styles.waAction}>
                  <Text style={styles.waActionText}>ربما</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Event description */}
        {description && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>تفاصيل المناسبة</Text>
            <Text style={styles.detailsText}>{description}</Text>
          </View>
        )}

        {/* Confirm checkbox */}
        <TouchableOpacity
          style={styles.confirmRow}
          onPress={() => setValue("confirmReviewed", !confirmReviewed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, confirmReviewed && styles.checkboxChecked]}>
            {confirmReviewed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.confirmLabel}>
            لقد راجعت جميع التفاصيل وأؤكد صحتها
          </Text>
        </TouchableOpacity>

      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Event header ──────────────────────────────────────────────────────────
  eventHeader: {
    marginBottom: 16,
  },
  eventTypeLabel: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    marginBottom: 2,
  },
  eventName: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },

  // ── Metrics 2×2 grid ──────────────────────────────────────────────────────
  metricsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metricItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 18,
  },

  // ── Invitation preview ────────────────────────────────────────────────────
  invitationSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 10,
  },
  waBubbleWrapper: {
    backgroundColor: "#E5DDD5",
    borderRadius: 12,
    padding: 12,
  },
  waBubble: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    overflow: "hidden",
  },
  waImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#F5F5F5",
  },
  waImagePlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#F9F4EF",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  waPlaceholderEmoji: {
    fontSize: 32,
  },
  waPlaceholderText: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#C28E5C",
  },
  waBody: {
    padding: 14,
    gap: 6,
  },
  waEventName: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "right",
    marginBottom: 4,
  },
  waMessage: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 22,
    textAlign: "right",
  },
  waMessageEmpty: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#999",
    textAlign: "right",
    fontStyle: "italic",
    lineHeight: 18,
  },
  waTemplateBadge: {
    marginTop: 6,
    alignSelf: "flex-end",
    backgroundColor: "#F5ECE4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  waTemplateBadgeText: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
  },
  waActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  waAction: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  waActionDivider: {
    width: 1,
    backgroundColor: "#F0F0F0",
  },
  waActionTextPrimary: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
  },
  waActionText: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
  },

  // ── Description ──────────────────────────────────────────────────────────
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 20,
  },

  // ── Confirm checkbox ──────────────────────────────────────────────────────
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
  },
  checkmark: {
    fontSize: 13,
    color: "#fff",
    fontFamily: "Cairo_700Bold",
  },
  confirmLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    lineHeight: 20,
    textAlign: "right",
  },
});

export default EventSummary;

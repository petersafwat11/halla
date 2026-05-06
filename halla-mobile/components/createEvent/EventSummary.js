import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useFormContext } from "react-hook-form";
import { useLanguage, useTranslation } from "../../localization";
import { formatCount, formatDateTime, localizeDigits } from "../../utils/locale";
import EventMetricsGrid from "./_components/EventMetricsGrid";
import WhatsAppInvitationPreview from "./_components/WhatsAppInvitationPreview";
import ScheduleLaunchCard from "./_components/ScheduleLaunchCard";

const EventSummary = () => {
  const { watch, setValue } = useFormContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation("createEvent");

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
  const sendSchedule = formData.sendSchedule || "now";
  const scheduleDate = formData.scheduleDate || null;
  const scheduleTime = formData.scheduleTime || "";
  const visualTemplate = formData.visualTemplate || null;
  const visualTemplateData = visualTemplate?.data || {};
  const visualTemplateFields = Array.isArray(visualTemplate?.fields) ? visualTemplate.fields : [];
  const invitationText = selectedTemplate?.bodyText || "";

  const getEventTypeLabel = () => {
    const types = {
      wedding: t("summary.eventTypes.wedding"),
      birthday: t("summary.eventTypes.birthday"),
      graduation: t("summary.eventTypes.graduation"),
      meeting: t("summary.eventTypes.meeting"),
      conference: t("summary.eventTypes.conference"),
      other: t("summary.eventTypes.other"),
    };
    return types[eventType] || t("summary.eventTypes.other");
  };

  const resolveFieldValue = (field) => {
    const raw = visualTemplateData[field.key];
    if (raw == null || raw === "") return "—";
    if (raw instanceof Date) return formatDateTime(raw, currentLanguage);
    if (typeof raw === "string") {
      if (field.type === "color" && /^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
      return currentLanguage === "ar" ? localizeDigits(raw, "ar") : raw;
    }
    if (typeof raw === "number") return formatCount(raw, currentLanguage);
    return String(raw);
  };

  const fieldLabel = (field) =>
    currentLanguage === "ar"
      ? field.labelAr || field.labelEn || field.key
      : field.labelEn || field.labelAr || field.key;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTypeLabel}>{getEventTypeLabel()}</Text>
          <Text style={styles.eventName}>{eventName}</Text>
        </View>

        <EventMetricsGrid
          guestCount={guestCount}
          moderatorCount={moderatorCount}
          eventDate={eventDate}
          eventTime={eventTime}
          location={location}
          t={t}
        />

        <WhatsAppInvitationPreview
          eventName={eventName}
          templateImage={templateImage}
          selectedTemplate={selectedTemplate}
          invitationText={invitationText}
          t={t}
        />

        {description && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{t("summary.details.title")}</Text>
            <Text style={styles.detailsText}>{description}</Text>
          </View>
        )}

        {visualTemplateFields.length > 0 && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{t("summary.templateDetails.title")}</Text>
            {visualTemplateFields.map((field) => (
              <View key={field.key} style={styles.templateRow}>
                <Text style={styles.templateRowLabel}>{fieldLabel(field)}</Text>
                <Text
                  style={[
                    styles.templateRowValue,
                    field.type === "color" && /^#[0-9a-f]{3,8}$/i.test(visualTemplateData[field.key])
                      ? { color: visualTemplateData[field.key] }
                      : null,
                  ]}
                  numberOfLines={2}
                >
                  {resolveFieldValue(field)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <ScheduleLaunchCard
          sendSchedule={sendSchedule}
          scheduleDate={scheduleDate}
          scheduleTime={scheduleTime}
          t={t}
        />

        <TouchableOpacity
          style={styles.confirmRow}
          onPress={() => setValue("confirmReviewed", !confirmReviewed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, confirmReviewed && styles.checkboxChecked]}>
            {confirmReviewed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.confirmLabel}>{t("summary.confirm.label")}</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  eventHeader: { marginBottom: 16 },
  eventTypeLabel: { fontSize: 13, fontFamily: "Cairo_500Medium", color: "#656565", marginBottom: 2 },
  eventName: { fontSize: 18, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5ECE4",
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C", marginBottom: 8 },
  detailsText: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#2C2C2C", lineHeight: 20 },
  templateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F5ECE4", gap: 12 },
  templateRowLabel: { fontSize: 12, fontFamily: "Cairo_500Medium", color: "#656565" },
  templateRowValue: { fontSize: 12, fontFamily: "Cairo_700Bold", color: "#2C2C2C", textAlign: "right", flexShrink: 1 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8, padding: 16, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#F5ECE4" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#C28E5C", justifyContent: "center", alignItems: "center", backgroundColor: "#fff", flexShrink: 0 },
  checkboxChecked: { backgroundColor: "#C28E5C", borderColor: "#C28E5C" },
  checkmark: { fontSize: 13, color: "#fff", fontFamily: "Cairo_700Bold" },
  confirmLabel: { flex: 1, fontSize: 13, fontFamily: "Cairo_500Medium", color: "#2C2C2C", lineHeight: 20, textAlign: "right" },
});

export default EventSummary;

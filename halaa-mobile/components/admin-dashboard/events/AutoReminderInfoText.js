import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import { useUpdateReminderSettings } from "../../../hooks/events/mutations/useEventMutation";
import { useMySubscription } from "../../../hooks/users";
import { colors, spacing, textStyles } from "../../../styles/tokens";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Combine a Date (or date string) with a 24h "HH:mm" string into one local
// Date. Used to resolve the scheduled-send instant (the lower bound of the
// free reminder window).
const combineDateTime = (date, hhmm) => {
  if (!date) return null;
  const base = date instanceof Date ? new Date(date) : new Date(date);
  if (Number.isNaN(base.getTime())) return null;
  if (typeof hhmm === "string") {
    const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      base.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
      return base;
    }
  }
  base.setHours(0, 0, 0, 0);
  return base;
};

/**
 * Small inline banner reminding the user that the platform auto-sends a
 * reminder. Allows customization of the schedule.
 *
 * @param {Object} props
 * @param {Object} props.event - The event object containing reminderSettings and status
 */
const AutoReminderInfoText = ({ event }) => {
  const { t, i18n } = useTranslation("events");
  const toast = useToast();
  const updateReminderMutation = useUpdateReminderSettings();
  // No event-scoped plan flag is exposed on the event payload — fall back to
  // the host's current plan code (same heuristic the web popup uses). This is
  // advisory only; the backend is authoritative for trial reminders.
  const { data: subData } = useMySubscription();
  const isTrial =
    subData?.data?.subscription?.[0]?.planCode === "trial";

  const [modalOpen, setModalOpen] = useState(false);
  const [customReminderTime, setCustomReminderTime] = useState(false);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Sync state with event data when modal opens or event changes
  useEffect(() => {
    if (event?.reminderSettings) {
      setCustomReminderTime(!!event.reminderSettings.customReminderTime);
      
      const sDate = event.reminderSettings.scheduledDate;
      if (sDate) {
        setDate(new Date(sDate));
      } else {
        setDate(new Date());
      }

      const sTime = event.reminderSettings.scheduledTime; // "HH:mm"
      const timeObj = new Date();
      if (sTime) {
        const [h, m] = sTime.split(":");
        timeObj.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      }
      setTime(timeObj);
    }
  }, [event, modalOpen]);

  if (!event) return null;

  const isEditable = !["completed", "cancelled"].includes(event.status);

  const formatTimeStr = (timeStr) => {
    if (!timeStr) return "";
    const [hStr, mStr] = timeStr.split(":");
    const hour = parseInt(hStr, 10);
    const min = parseInt(mStr, 10);
    const lang = i18n.language || "ar";
    const ampm = hour >= 12 ? (lang === "ar" ? "م" : "PM") : (lang === "ar" ? "ص" : "AM");
    const hour12 = hour % 12 || 12;
    const minStr = String(min).padStart(2, "0");
    return `${hour12}:${minStr} ${ampm}`;
  };

  const formatDateLabel = (d) => {
    return d.toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimeLabel = (tDate) => {
    return tDate.toLocaleTimeString(i18n.language === "ar" ? "ar-EG" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasCustom = !!event.reminderSettings?.customReminderTime;
  const customDate = event.reminderSettings?.scheduledDate;
  const customTime = event.reminderSettings?.scheduledTime;

  // Free reminder to CONFIRMED guests (no "48h" / pending wording anymore).
  let infoText = t(
    "autoReminderInfo",
    "نرسل تذكيراً مجانياً لضيوفك الذين أكدوا الحضور قبل المناسبة."
  );

  if (hasCustom && customDate && customTime) {
    const formattedDate = formatDateLabel(new Date(customDate));
    const formattedTime = formatTimeStr(customTime);
    infoText = t(
      "autoReminderInfoCustom",
      {
        defaultValue: "نرسل تذكيراً مجانياً لضيوفك الذين أكدوا الحضور في {{date}} الساعة {{time}}.",
        date: formattedDate,
        time: formattedTime,
      }
    );
  }

  // Free reminder window: [scheduledSend, event − 24h]. Lower bound is the
  // launch send time when scheduled, otherwise "now". Upper bound is 24h
  // before the event start. The backend is authoritative and returns
  // REMINDER_OUT_OF_RANGE if the chosen instant falls outside.
  const sendInstant = combineDateTime(
    event?.launchSettings?.scheduledDate,
    event?.launchSettings?.scheduledTime
  );
  const eventInstant = (() => {
    const d = event?.eventDetails?.date
      ? new Date(event.eventDetails.date)
      : event?.date
      ? new Date(event.date)
      : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  })();
  const nowTs = Date.now();
  const lowerBound =
    sendInstant && sendInstant.getTime() > nowTs ? sendInstant : new Date(nowTs);
  const upperBound = eventInstant
    ? new Date(eventInstant.getTime() - ONE_DAY_MS)
    : null;

  const handleDatePress = () => {
    setShowDatePicker((prev) => !prev);
    setShowTimePicker(false);
  };

  const handleTimePress = () => {
    setShowTimePicker((prev) => !prev);
    setShowDatePicker(false);
  };

  const onSave = async () => {
    let payload = {
      customReminderTime,
    };

    if (customReminderTime) {
      if (!date || !time) {
        toast.error(
          t(
            "reminderCustomize.errors.dateTimeRequired",
            "التاريخ والوقت مطلوبان لتخصيص التذكير"
          )
        );
        return;
      }

      // Convert time to Riyadh wall clock 24h format "HH:mm"
      const hour = time.getHours();
      const minute = time.getMinutes();
      const time24 = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      // Client-side guard against the window [scheduledSend, event−24h]. The
      // backend is authoritative (REMINDER_OUT_OF_RANGE) but catching it here
      // saves a round-trip.
      const chosenInstant = combineDateTime(date, time24);
      if (
        chosenInstant &&
        ((lowerBound && chosenInstant.getTime() < lowerBound.getTime()) ||
          (upperBound && chosenInstant.getTime() > upperBound.getTime()))
      ) {
        toast.error(
          t(
            "reminderCustomize.errors.outOfRange",
            "يجب أن يكون وقت التذكير بعد بدء الإرسال وقبل المناسبة بـ 24 ساعة على الأقل."
          )
        );
        return;
      }

      // Convert date to UTC midnight ISO string
      const utcMidnight = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      ).toISOString();

      payload.scheduledDate = utcMidnight;
      payload.scheduledTime = time24;
    } else {
      payload.scheduledDate = null;
      payload.scheduledTime = null;
    }

    try {
      await updateReminderMutation.mutateAsync({
        eventId: event._id || event.id,
        data: payload,
      });
      toast.success(t("saveSuccess", "تم حفظ إعدادات التذكير بنجاح"));
      setModalOpen(false);
    } catch (err) {
      if (err?.code === "REMINDER_OUT_OF_RANGE") {
        toast.error(
          t(
            "reminderCustomize.errors.outOfRange",
            "يجب أن يكون وقت التذكير بعد بدء الإرسال وقبل المناسبة بـ 24 ساعة على الأقل."
          )
        );
      } else {
        toast.error(
          err?.message ||
            t("reminderCustomize.errors.generic", "تعذّر حفظ إعدادات التذكير")
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.banner} accessibilityRole="text">
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={16} color={colors.primary[700]} />
        </View>
        <Text style={styles.text}>{infoText}</Text>
        {isEditable && (
          <TouchableOpacity
            style={styles.customizeButton}
            onPress={() => setModalOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.customizeButtonText}>
              {t("customizeReminder", "Customize")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalOpen(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("customizeReminderModalTitle", "Customize automatic reminder")}
              </Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalOpen(false)}
              >
                <Ionicons name="close" size={24} color={colors.natural[900]} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.modalDescription}>
                {t(
                  "reminderCustomize.description",
                  "نرسل تذكيراً مجانياً لضيوفك الذين أكدوا الحضور قبل المناسبة."
                )}
              </Text>

              {isTrial && (
                // Advisory only — derived from the host's current plan, not the
                // event's. Trial reminders are auto (send + 10min) and can't be
                // customized; the backend is authoritative.
                <Text style={styles.trialInfo}>
                  {t(
                    "reminderCustomize.trialInfo",
                    "في الباقة التجريبية، يُرسل التذكير تلقائياً بعد 10 دقائق من إرسال الدعوات ولا يمكن تخصيصه."
                  )}
                </Text>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  {t("customReminderCheckbox", "تخصيص وقت التذكير")}
                </Text>
                <Switch
                  value={customReminderTime}
                  onValueChange={(val) => {
                    setCustomReminderTime(val);
                    if (!val) {
                      setShowDatePicker(false);
                      setShowTimePicker(false);
                    }
                  }}
                  trackColor={{ false: colors.natural[250], true: colors.primary[200] }}
                  thumbColor={customReminderTime ? colors.primary[500] : colors.natural[350]}
                />
              </View>

              {customReminderTime && (
                <View style={styles.pickerSection}>
                  <Text style={styles.pickerLabel}>
                    {t("reminderCustomize.dateLabel", "التاريخ")}
                  </Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={handleDatePress}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.primary[500]} />
                    <Text style={styles.pickerButtonText}>{formatDateLabel(date)}</Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      minimumDate={lowerBound || undefined}
                      maximumDate={upperBound || undefined}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === "android") setShowDatePicker(false);
                        if (selectedDate) setDate(selectedDate);
                      }}
                      textColor={colors.natural[900]}
                    />
                  )}

                  <Text style={styles.pickerLabel}>
                    {t("reminderCustomize.timeLabel", "الوقت")}
                  </Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={handleTimePress}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.primary[500]} />
                    <Text style={styles.pickerButtonText}>{formatTimeLabel(time)}</Text>
                  </TouchableOpacity>

                  {showTimePicker && (
                    <DateTimePicker
                      value={time}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, selectedTime) => {
                        if (Platform.OS === "android") setShowTimePicker(false);
                        if (selectedTime) setTime(selectedTime);
                      }}
                      textColor={colors.natural[900]}
                    />
                  )}

                  <Text style={styles.windowHint}>
                    {t(
                      "reminderCustomize.windowHint",
                      "اختر وقتاً بعد بدء الإرسال وقبل المناسبة بـ 24 ساعة على الأقل."
                    )}
                  </Text>
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.secondaryBtn]}
                  onPress={() => setModalOpen(false)}
                  disabled={updateReminderMutation.isPending}
                >
                  <Text style={styles.secondaryBtnText}>
                    {t("reminderCustomize.cancel", "إلغاء")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.primaryBtn]}
                  onPress={onSave}
                  disabled={updateReminderMutation.isPending}
                >
                  <Text style={styles.primaryBtnText}>
                    {t("save", "Save")}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[8] || 8,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10] || 10,
    paddingVertical: spacing[10] || 10,
    paddingHorizontal: spacing[12],
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginHorizontal: spacing[4],
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    ...textStyles.bodyMedium,
    color: colors.primary[800],
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
  },
  customizeButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  customizeButtonText: {
    color: "#FFF",
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    ...textStyles.h3,
    color: colors.natural[900],
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 4,
  },
  switchLabel: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    fontFamily: "Cairo_500Medium",
    fontSize: 15,
  },
  modalDescription: {
    ...textStyles.bodyMedium,
    color: colors.natural[500] || "#656565",
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  trialInfo: {
    ...textStyles.bodySmall,
    color: colors.primary[700],
    backgroundColor: colors.primary[50],
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  windowHint: {
    ...textStyles.bodySmall,
    color: colors.natural[400],
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  pickerSection: {
    marginBottom: 20,
  },
  pickerLabel: {
    ...textStyles.bodySmall,
    color: colors.natural[400],
    fontFamily: "Cairo_500Medium",
    marginBottom: 8,
    fontSize: 13,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.natural[250],
    borderRadius: 12,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
    marginBottom: 16,
  },
  pickerButtonText: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: colors.primary[500],
  },
  primaryBtnText: {
    color: "#FFF",
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: colors.natural[250],
    backgroundColor: "#FFF",
  },
  secondaryBtnText: {
    color: colors.natural[400],
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
  },
});

export default AutoReminderInfoText;

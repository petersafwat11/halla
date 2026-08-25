import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, FormProvider } from "react-hook-form";
import { useTranslation } from "../../../localization";
import { formatDate, formatTime } from "@halaa/shared/utils/locale";
import { normalizeSubscriptionResponse } from "@halaa/shared/utils";
import { useToast } from "../../../contexts/ToastContext";
import { useUpdateReminderSettings } from "../../../hooks/events/mutations/useEventMutation";
import { useMySubscription } from "../../../hooks/users";
import { colors, spacing, textStyles } from "../../../styles/tokens";
import LocalizedText from "../../commen/LocalizedText";
import DatePicker from "../../commen/DatePicker";
import TimePicker from "../../commen/TimePicker";

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
 * The customize sheet renders the shared DatePicker/TimePicker under a local
 * FormProvider, so iOS gets the common bottom sheet with draft ownership and
 * Android the native dialog — identical to create/update event Step 1.
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
  const normalizedSub = normalizeSubscriptionResponse(subData);
  const isTrial = normalizedSub.subscription?.planCode === "trial";

  const [modalOpen, setModalOpen] = useState(false);
  const [customReminderTime, setCustomReminderTime] = useState(false);

  // Shared field contract requires a react-hook-form context; the two picker
  // values live here instead of ad-hoc state so the migrated primitives apply
  // unchanged.
  const methods = useForm({
    defaultValues: { reminderDate: new Date(), reminderTime: new Date() },
  });
  const { reset, getValues } = methods;

  // Sync state with event data when modal opens or event changes
  useEffect(() => {
    if (event?.reminderSettings) {
      setCustomReminderTime(!!event.reminderSettings.customReminderTime);

      const sDate = event.reminderSettings.scheduledDate;
      const nextDate = sDate ? new Date(sDate) : new Date();

      const nextTime = new Date();
      const sTime = event.reminderSettings.scheduledTime; // "HH:mm"
      if (sTime) {
        const [h, m] = sTime.split(":");
        nextTime.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      }
      reset({ reminderDate: nextDate, reminderTime: nextTime });
    }
  }, [event, modalOpen, reset]);

  if (!event) return null;

  const isEditable = !["completed", "cancelled"].includes(event.status);

  // Stored "HH:mm" strings are localized through the shared locale utility —
  // never hand-assembled "6:30 PM" tokens that scramble inside Arabic copy.
  const formatTimeStr = (timeStr) => {
    if (!timeStr) return "";
    return formatTime(timeStr, i18n.language || "ar");
  };

  const formatDateLabel = (d) => formatDate(d, i18n.language || "ar");
  const formatTimeLabel = (tDate) => formatTime(tDate, i18n.language || "ar");

  const hasCustom = !!event.reminderSettings?.customReminderTime;
  const customDate = event.reminderSettings?.scheduledDate;
  const customTime = event.reminderSettings?.scheduledTime;

  // Free reminder to CONFIRMED guests (no "48h" / pending wording anymore).
  let infoText = t("autoReminderInfo");

  if (hasCustom && customDate && customTime) {
    const formattedDate = formatDateLabel(new Date(customDate));
    const formattedTime = formatTimeStr(customTime);
    infoText = t(
      "autoReminderInfoCustom",
      {
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

  const onSave = async () => {
    let payload = {
      customReminderTime,
    };

    if (customReminderTime) {
      const currentDate = getValues("reminderDate");
      const currentTime = getValues("reminderTime");
      if (!currentDate || !currentTime) {
        toast.error(
          t("reminderCustomize.errors.dateTimeRequired")
        );
        return;
      }

      // Convert time to Riyadh wall clock 24h format "HH:mm"
      const hour = currentTime.getHours();
      const minute = currentTime.getMinutes();
      const time24 = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      // Client-side guard against the window [scheduledSend, event−24h]. The
      // backend is authoritative (REMINDER_OUT_OF_RANGE) but catching it here
      // saves a round-trip.
      const chosenInstant = combineDateTime(currentDate, time24);
      if (
        chosenInstant &&
        ((lowerBound && chosenInstant.getTime() < lowerBound.getTime()) ||
          (upperBound && chosenInstant.getTime() > upperBound.getTime()))
      ) {
        toast.error(
          t("reminderCustomize.errors.outOfRange")
        );
        return;
      }

      // Convert date to UTC midnight ISO string
      const utcMidnight = new Date(
        Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
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
      toast.success(t("saveSuccess"));
      setModalOpen(false);
    } catch (err) {
      if (err?.code === "REMINDER_OUT_OF_RANGE") {
        toast.error(
          t("reminderCustomize.errors.outOfRange")
        );
      } else {
        toast.error(
          err?.message ||
            t("reminderCustomize.errors.generic")
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
        <LocalizedText style={styles.text}>{infoText}</LocalizedText>
        {isEditable && (
          <TouchableOpacity
            style={styles.customizeButton}
            onPress={() => setModalOpen(true)}
            activeOpacity={0.7}
          >
            <LocalizedText style={styles.customizeButtonText}>
              {t("customizeReminder")}
            </LocalizedText>
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
              <LocalizedText style={styles.modalTitle}>
                {t("customizeReminderModalTitle")}
              </LocalizedText>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalOpen(false)}
              >
                <Ionicons name="close" size={24} color={colors.natural[900]} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              <LocalizedText style={styles.modalDescription}>
                {t("reminderCustomize.description")}
              </LocalizedText>

              {isTrial && (
                // Advisory only — derived from the host's current plan, not the
                // event's. Trial reminders are auto (send + 10min) and can't be
                // customized; the backend is authoritative.
                <LocalizedText style={styles.trialInfo}>
                  {t("reminderCustomize.trialInfo")}
                </LocalizedText>
              )}

              <View style={styles.switchRow}>
                <LocalizedText style={styles.switchLabel}>
                  {t("customReminderCheckbox")}
                </LocalizedText>
                <Switch
                  value={customReminderTime}
                  onValueChange={setCustomReminderTime}
                  trackColor={{ false: colors.natural[250], true: colors.primary[200] }}
                  thumbColor={customReminderTime ? colors.primary[500] : colors.natural[350]}
                />
              </View>

              {customReminderTime && (
                <View style={styles.pickerSection}>
                  {/* Shared field-contract pickers: localized labels, BiDi-
                      isolated locale-formatted values, iOS bottom sheet with
                      draft ownership, Android native dialog (blueprint §4.3).
                      The calendar itself is bounded by the reminder window;
                      the exact instant is re-checked on save because a
                      day-granular bound cannot constrain the clock. */}
                  <FormProvider {...methods}>
                    <DatePicker
                      name="reminderDate"
                      label={t("reminderCustomize.dateLabel")}
                      minimumDate={lowerBound || undefined}
                      maximumDate={upperBound || undefined}
                    />
                    <TimePicker
                      name="reminderTime"
                      label={t("reminderCustomize.timeLabel")}
                    />
                  </FormProvider>

                  <LocalizedText style={styles.windowHint}>
                    {t("reminderCustomize.windowHint")}
                  </LocalizedText>
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.secondaryBtn]}
                  onPress={() => setModalOpen(false)}
                  disabled={updateReminderMutation.isPending}
                >
                  <LocalizedText style={styles.secondaryBtnText} center>
                    {t("reminderCustomize.cancel")}
                  </LocalizedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.primaryBtn]}
                  onPress={onSave}
                  disabled={updateReminderMutation.isPending}
                >
                  <LocalizedText style={styles.primaryBtnText} center>
                    {t("save")}
                  </LocalizedText>
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
    marginStart: 8,
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

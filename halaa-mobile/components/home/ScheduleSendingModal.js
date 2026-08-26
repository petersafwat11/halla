import React, { useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import DatePicker from "../commen/DatePicker";
import TimePicker from "../commen/TimePicker";
import Button from "../commen/Button";
import LocalizedText from "../commen/LocalizedText";
import { normalizeSubscriptionResponse } from "@halaa/shared/utils";
import { useScheduleSend } from "../../hooks/messaging";
import { useMySubscription } from "../../hooks/users";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// Floor a date to local calendar midnight — the picker is day-granular.
const toDay = (d) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

// Live scheduling window lower bound: now + minLead.
//   minLead: trial = 15min, paid = 24h.
const getMinSendDate = (isTrial) => {
  const leadMs = isTrial ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return toDay(new Date(Date.now() + leadMs));
};

// Schema is plan-aware: validate against the same min-send day used by the
// picker bound, so trial hosts can schedule inside the 2-day window.
const buildSchema = (t, isTrial) =>
  z
    .object({
      scheduledDate: z.date({ required_error: t("scheduleSend.validation.dateRequired") }),
      scheduledTime: z.date({ required_error: t("scheduleSend.validation.timeRequired") }),
    })
    .refine((data) => toDay(data.scheduledDate) >= getMinSendDate(isTrial), {
      message: t("scheduleSend.validation.minDate"),
      path: ["scheduledDate"],
    });

// Backend Zod schema for /messaging/schedule expects 24h "HH:mm".
const formatTimeForAPI = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Restore a stored 24h "HH:mm" token as a Date so re-opening the modal keeps
// the previously scheduled send time instead of silently clearing it.
const timeFromHHmm = (hhmm) => {
  const match = String(hhmm ?? "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const d = new Date();
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d;
};

// Backend reads `getUTCDate()` from `scheduledDate`, so a local-midnight
// Date serialized via `.toISOString()` shifts the calendar day back one
// in any UTC+ zone (e.g. Riyadh +3). Build UTC-midnight of the picked
// Y/M/D so the backend sees the day the user actually selected.
const toUtcMidnightIso = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  ).toISOString();
};

const ScheduleSendingModal = ({
  visible,
  onClose,
  onSuccess,
  eventId,
  existingSchedule,
  eventDate,
  eventTime,
}) => {
  const { t } = useTranslation("events");
  const scheduleSend = useScheduleSend();
  const { data: subData } = useMySubscription();
  const normalizedSub = normalizeSubscriptionResponse(subData);
  const isTrial = normalizedSub.subscription?.planCode === "trial";

  const methods = useForm({
    resolver: zodResolver(buildSchema(t, isTrial)),
    mode: "onChange",
    defaultValues: {
      scheduledDate: existingSchedule?.scheduledDate
        ? new Date(existingSchedule.scheduledDate)
        : null,
      scheduledTime: timeFromHHmm(existingSchedule?.scheduledTime),
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (!visible) return;
    reset({
      scheduledDate: existingSchedule?.scheduledDate
        ? new Date(existingSchedule.scheduledDate)
        : null,
      scheduledTime: timeFromHHmm(existingSchedule?.scheduledTime),
    });
  }, [
    visible,
    existingSchedule?.scheduledDate,
    existingSchedule?.scheduledTime,
    reset,
  ]);

  const isPending = isSubmitting || scheduleSend.isPending;

  // Live scheduling window: [now + minLead, event − 3d]. The picker is
  // day-granular; the backend is authoritative and returns SCHEDULE_TOO_SOON /
  // SCHEDULE_TOO_LATE for boundary cases.
  const minDate = useMemo(() => getMinSendDate(isTrial), [isTrial]);
  const maxDate = useMemo(() => {
    if (!eventDate) return undefined;
    const ev = new Date(eventDate);
    if (Number.isNaN(ev.getTime())) return undefined;
    const match = String(eventTime || "").match(/^(\d{1,2}):(\d{2})/);
    if (match) ev.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return toDay(new Date(ev.getTime() - THREE_DAYS_MS));
  }, [eventDate, eventTime]);

  const onSubmit = async (data) => {
    const chosenDay = toDay(new Date(data.scheduledDate));
    if (minDate && chosenDay < minDate) {
      Alert.alert(t("alerts.errorTitle"), t("scheduleSend.validation.tooSoon"));
      return;
    }
    if (maxDate && chosenDay > maxDate) {
      Alert.alert(t("alerts.errorTitle"), t("scheduleSend.validation.tooLate"));
      return;
    }
    try {
      await scheduleSend.mutateAsync({
        eventId,
        scheduledDate: toUtcMidnightIso(data.scheduledDate),
        scheduledTime: formatTimeForAPI(data.scheduledTime),
      });
      reset();
      if (onSuccess) onSuccess();
      onClose();
      Alert.alert(t("scheduleSend.title"), t("scheduleSend.success"));
    } catch (error) {
      // Localized chrome: alert titles/messages follow the UI locale even
      // when the failure payload is an LTR backend token.
      if (error?.code === "SCHEDULE_TOO_SOON" || error?.code === "EVENT_DATE_TOO_SOON") {
        Alert.alert(t("alerts.errorTitle"), t("scheduleSend.validation.tooSoon"));
      } else if (error?.code === "SCHEDULE_TOO_LATE") {
        Alert.alert(t("alerts.errorTitle"), t("scheduleSend.validation.tooLate"));
      } else {
        Alert.alert(
          t("alerts.errorTitle"),
          error?.message || t("scheduleSend.error")
        );
      }
    }
  };

  const handleClose = () => {
    if (!isPending) {
      reset({
        scheduledDate: existingSchedule?.scheduledDate
          ? new Date(existingSchedule.scheduledDate)
          : null,
        scheduledTime: timeFromHHmm(existingSchedule?.scheduledTime),
      });
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header: title/description at the logical start, close at the
              logical end. */}
          <View style={styles.header}>
            <View style={styles.titleWrapper}>
              <LocalizedText role="pageTitle" style={styles.title}>
                {t("scheduleSend.title")}
              </LocalizedText>
              <LocalizedText role="description" style={styles.description}>
                {t("scheduleSend.description")}
              </LocalizedText>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={8}
              disabled={isPending}
              accessibilityRole="button"
              accessibilityLabel={t("scheduleSend.cancel")}
            >
              {/* Close glyph is not direction-mirrored (§7). */}
              <Ionicons name="close" size={24} color="#2C2C2C" />
            </TouchableOpacity>
          </View>

          <FormProvider {...methods}>
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentInner}
            >
              {/* Date Picker — shared field-contract primitive: localized
                  label/placeholder, locale-formatted date value. */}
              <DatePicker
                name="scheduledDate"
                label={t("scheduleSend.date")}
                placeholder={t("scheduleSend.datePlaceholder")}
                minimumDate={minDate}
                maximumDate={maxDate}
              />

              {/* Time Picker */}
              <TimePicker
                name="scheduledTime"
                label={t("scheduleSend.time")}
                placeholder={t("scheduleSend.timePlaceholder")}
              />

              {/* Scheduling-window note */}
              <View style={styles.infoBox}>
                <Ionicons name="time-outline" size={16} color="#C28E5C" />
                <LocalizedText role="hint" style={styles.infoText}>
                  {t("scheduleSend.windowNote")}
                </LocalizedText>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <View style={styles.actionBtn}>
                <Button
                  text={t("scheduleSend.cancel")}
                  variant="outline"
                  onPress={handleClose}
                  disabled={isPending}
                />
              </View>
              <View style={styles.actionBtn}>
                <Button
                  text={isPending ? t("scheduleSend.scheduling") : t("scheduleSend.confirm")}
                  variant="primary"
                  onPress={handleSubmit(onSubmit)}
                  loading={isPending}
                  disabled={isPending}
                />
              </View>
            </View>
          </FormProvider>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: "90%",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  titleWrapper: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28,
  },
  description: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 24,
  },
  contentInner: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F9F4EF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8D4C4",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#6B4E33",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  actionBtn: {
    flex: 1,
  },
});

export default ScheduleSendingModal;

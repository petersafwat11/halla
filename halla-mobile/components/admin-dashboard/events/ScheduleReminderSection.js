import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import {
  useCreateScheduledExtraReminder,
  useCancelScheduledExtraReminder,
  useScheduledExtraReminders,
} from "../../../hooks/scheduledExtraReminders";
import { useSingleEventStats } from "../../../hooks/events/queries";
import { colors, spacing, textStyles } from "../../../styles/tokens";

const FIVE_MIN_MS = 5 * 60 * 1000;
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

function filterGuestsByReminderType(guests, type) {
  return (guests || []).filter((g) => {
    const response = g.rsvp?.response || null;
    const responded = g.rsvp?.responded === true;
    if (response === "declined") return false;
    if (type === "reminder_confirmed") return response === "confirmed";
    return !responded || response === "pending" || response === "maybe";
  });
}

/**
 * "Schedule extra reminder" section shown on the mobile event-details
 * screen for hosts and platform admins. Visibility gates on the event-
 * owner's quota (the `event.subscription` enrichment from
 * events.crud.service.getEventById) and on a valid send window of
 * [now+5min, eventDate-24h].
 *
 * Self-fetches the event + guests via `useSingleEventStats(eventId)` so
 * the component is drop-in for any context that has just an eventId.
 * Optional `event`/`guests` props override the fetched values when the
 * caller already has them.
 *
 * @param {Object} props
 * @param {string} props.eventId
 * @param {Object} [props.event]
 * @param {Array}  [props.guests]
 */
const ScheduleReminderSection = ({
  eventId,
  event: eventProp,
  guests: guestsProp,
}) => {
  const { t } = useTranslation("events");
  const toast = useToast();
  // Always fetch — the section needs `event.subscription` (only present on
  // the GET /events/:id payload) and rsvp-populated `guestList`. The
  // overrides let callers reuse already-loaded data when available.
  const statsQuery = useSingleEventStats(eventId);
  const event =
    eventProp || statsQuery.data?.event || null;
  const guests =
    guestsProp ||
    (Array.isArray(event?.guestList) ? event.guestList : statsQuery.data?.guests) ||
    [];

  const { data: scheduledResp } = useScheduledExtraReminders(eventId);
  const createMutation = useCreateScheduledExtraReminder();
  const cancelMutation = useCancelScheduledExtraReminder();
  const [modalOpen, setModalOpen] = useState(false);
  const [reminderType, setReminderType] = useState("reminder_pending");
  const [selected, setSelected] = useState(() => new Set());
  const [scheduledFor, setScheduledFor] = useState(() => {
    return new Date(Date.now() + 60 * 60_000); // default: 1h from now
  });
  const [showPicker, setShowPicker] = useState(false);

  const scheduled = scheduledResp?.data?.scheduledReminders || [];
  const pending = scheduled.filter((r) => r.status === "pending");

  const remindersRemaining = event?.subscription?.remindersRemaining ?? 0;
  const eventDate =
    event?.eventDetails?.date ||
    event?.date ||
    null;
  const eventTs = eventDate ? new Date(eventDate).getTime() : NaN;
  const now = Date.now();
  const hasValidWindow =
    Number.isFinite(eventTs) && eventTs - TWENTY_FOUR_H_MS > now + FIVE_MIN_MS;

  const canSee =
    !!event?.subscriptionId &&
    hasValidWindow &&
    (remindersRemaining > 0 || pending.length > 0);

  const minDt = useMemo(() => new Date(Date.now() + FIVE_MIN_MS), [modalOpen]);
  const maxDt = useMemo(
    () => (Number.isFinite(eventTs) ? new Date(eventTs - TWENTY_FOUR_H_MS) : null),
    [eventTs]
  );

  const candidateGuests = useMemo(
    () => filterGuestsByReminderType(guests, reminderType),
    [guests, reminderType]
  );

  // Keep selection within the eligible pool when reminderType flips.
  useEffect(() => {
    setSelected((prev) => {
      const allowed = new Set(candidateGuests.map((g) => String(g._id || g.guestId)));
      const next = new Set();
      for (const id of prev) if (allowed.has(id)) next.add(id);
      return next;
    });
  }, [candidateGuests]);

  if (!canSee) return null;

  const usedCount = selected.size;
  const overQuota = usedCount > remindersRemaining;

  const toggleGuest = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === candidateGuests.length) return new Set();
      return new Set(candidateGuests.map((g) => String(g._id || g.guestId)));
    });
  };

  const onSubmit = async () => {
    if (selected.size === 0) {
      toast.error(t("scheduleReminder.errors.noGuests", "Select at least one guest"));
      return;
    }
    const target = scheduledFor.getTime();
    if (target < minDt.getTime() || (maxDt && target > maxDt.getTime())) {
      toast.error(
        t(
          "scheduleReminder.errors.dateOutOfRange",
          "Date must be between 5 minutes from now and 24 hours before the event"
        )
      );
      return;
    }
    if (overQuota) {
      toast.error(
        t("scheduleReminder.errors.insufficientQuota", "Insufficient reminder quota")
      );
      return;
    }
    try {
      await createMutation.mutateAsync({
        eventId,
        body: {
          reminderType,
          guestIds: Array.from(selected),
          scheduledFor: scheduledFor.toISOString(),
        },
      });
      toast.success(t("scheduleReminder.scheduledOk", "Reminder scheduled"));
      setModalOpen(false);
      setSelected(new Set());
    } catch (err) {
      toast.error(
        err?.message ||
          t("scheduleReminder.errors.generic", "Could not schedule the reminder")
      );
    }
  };

  const onCancelReminder = (rid) => {
    Alert.alert(
      t("scheduleReminder.cancelAction", "Cancel reminder"),
      t(
        "scheduleReminder.cancelConfirm",
        "Cancel this scheduled reminder? Quota will be refunded."
      ),
      [
        { text: t("scheduleReminder.cancel", "Cancel"), style: "cancel" },
        {
          text: t("scheduleReminder.cancelAction", "Cancel reminder"),
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync({ eventId, reminderId: rid });
              toast.success(
                t("scheduleReminder.cancelledOk", "Reminder cancelled")
              );
            } catch (err) {
              toast.error(
                err?.message ||
                  t("scheduleReminder.errors.cancelFailed", "Could not cancel the reminder")
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>
          {t("scheduleReminder.heading", "Extra reminders")}
        </Text>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            remindersRemaining <= 0 && styles.btnDisabled,
          ]}
          disabled={remindersRemaining <= 0}
          onPress={() => setModalOpen(true)}
        >
          <Ionicons name="alarm-outline" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {t("scheduleReminder.button", "Schedule extra reminder")}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.remaining}>
        {t("scheduleReminder.quotaValue", {
          defaultValue: "{{used}} of {{remaining}} available",
          used: 0,
          remaining: remindersRemaining,
        })}
      </Text>

      {pending.length === 0 ? (
        <Text style={styles.muted}>
          {t("scheduleReminder.noScheduled", "No scheduled extra reminders")}
        </Text>
      ) : (
        pending.map((r) => (
          <View key={r._id} style={styles.scheduledRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduledType}>
                {t(`scheduleReminder.type.${r.reminderType}`, r.reminderType)}
              </Text>
              <Text style={styles.scheduledMeta}>
                {t("scheduleReminder.scheduledFor", {
                  defaultValue: "Scheduled for {{when}}",
                  when: new Date(r.scheduledFor).toLocaleString(),
                })}
              </Text>
              <Text style={styles.scheduledMeta}>
                {t("scheduleReminder.guestCount", {
                  defaultValue: "{{count}} guest(s)",
                  count: r.consumedQuota,
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => onCancelReminder(r._id)}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.danger?.[500] || "#c62828"} />
            </TouchableOpacity>
          </View>
        ))
      )}

      <Modal
        visible={modalOpen}
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t("scheduleReminder.modalTitle", "Schedule extra reminder")}
            </Text>
            <Pressable onPress={() => setModalOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.natural?.[600] || "#666"} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing[12], gap: spacing[12] }}>
            <Text style={styles.label}>
              {t("scheduleReminder.typeLabel", "Reminder type")}
            </Text>
            {[
              { value: "reminder_pending", labelKey: "scheduleReminder.typePending" },
              { value: "reminder_confirmed", labelKey: "scheduleReminder.typeConfirmed" },
            ].map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.radioRow}
                onPress={() => setReminderType(opt.value)}
              >
                <Ionicons
                  name={reminderType === opt.value ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={colors.primary?.[500] || "#3498db"}
                />
                <Text style={styles.radioText}>{t(opt.labelKey, opt.value)}</Text>
              </Pressable>
            ))}

            <View style={styles.guestsHeader}>
              <Text style={styles.label}>
                {t("scheduleReminder.guestsLabel", "Select guests")}
              </Text>
              <TouchableOpacity onPress={toggleAll}>
                <Text style={styles.linkBtn}>
                  {selected.size === candidateGuests.length && candidateGuests.length > 0
                    ? t("scheduleReminder.deselectAll", "Deselect all")
                    : t("scheduleReminder.selectAll", "Select all")}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.guestsList}>
              {candidateGuests.length === 0 ? (
                <Text style={styles.muted}>
                  {t(
                    "scheduleReminder.noEligibleGuests",
                    "No eligible guests for this reminder type."
                  )}
                </Text>
              ) : (
                candidateGuests.map((g) => {
                  const id = String(g._id || g.guestId);
                  const checked = selected.has(id);
                  return (
                    <Pressable
                      key={id}
                      style={styles.guestRow}
                      onPress={() => toggleGuest(id)}
                    >
                      <Ionicons
                        name={checked ? "checkbox" : "square-outline"}
                        size={20}
                        color={
                          checked
                            ? colors.primary?.[500] || "#3498db"
                            : colors.natural?.[400] || "#bbb"
                        }
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.guestName}>{g.name}</Text>
                        <Text style={styles.guestPhone}>{g.phone}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>

            <Text style={styles.label}>
              {t("scheduleReminder.dateLabel", "Send at")}
            </Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowPicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary?.[500]} />
              <Text style={styles.dateBtnText}>
                {scheduledFor.toLocaleString()}
              </Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={scheduledFor}
                mode="datetime"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={minDt}
                maximumDate={maxDt || undefined}
                onChange={(event, date) => {
                  if (Platform.OS === "android") setShowPicker(false);
                  if (date) setScheduledFor(date);
                }}
              />
            )}

            <View style={styles.quotaRow}>
              <Text style={styles.label}>
                {t("scheduleReminder.quotaLabel", "Quota")}
              </Text>
              <Text style={overQuota ? styles.quotaBad : styles.quotaOk}>
                {t("scheduleReminder.quotaValue", {
                  defaultValue: "{{used}} of {{remaining}} available",
                  used: usedCount,
                  remaining: remindersRemaining,
                })}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => setModalOpen(false)}
                disabled={createMutation.isPending}
              >
                <Text style={styles.secondaryBtnText}>
                  {t("scheduleReminder.cancel", "Cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { flex: 1 },
                  (createMutation.isPending || overQuota) && styles.btnDisabled,
                ]}
                onPress={onSubmit}
                disabled={createMutation.isPending || overQuota}
              >
                <Text style={styles.primaryBtnText}>
                  {createMutation.isPending
                    ? t("scheduleReminder.submitting", "Scheduling…")
                    : t("scheduleReminder.submit", "Schedule")}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: spacing[12],
    marginHorizontal: spacing[4],
    gap: spacing[8],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[8],
  },
  heading: { ...textStyles.titleSmall, color: colors.natural?.[800] || "#2c3e50" },
  remaining: { ...textStyles.caption, color: colors.natural?.[500] || "#7f8c8d" },
  muted: { ...textStyles.caption, color: colors.natural?.[450] || "#95a5a6" },
  scheduledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    padding: spacing[12],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.natural?.[200] || "#e3e8ee",
    backgroundColor: "#fbfcfd",
  },
  scheduledType: { ...textStyles.bodyMedium, fontWeight: "600", color: colors.natural?.[800] },
  scheduledMeta: { ...textStyles.caption, color: colors.natural?.[500] || "#7f8c8d" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary?.[500] || "#3498db",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.natural?.[300] || "#d6dde2",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryBtnText: { color: colors.natural?.[700] || "#2c3e50", fontWeight: "500" },
  btnDisabled: { opacity: 0.5 },
  cancelBtn: { padding: 6 },
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural?.[200] || "#eee",
  },
  modalTitle: { ...textStyles.titleMedium, color: colors.natural?.[800] || "#2c3e50" },
  label: { ...textStyles.bodyMedium, fontWeight: "600", color: colors.natural?.[800] },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  radioText: { ...textStyles.bodyMedium, color: colors.natural?.[700] || "#2c3e50" },
  guestsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkBtn: { color: colors.primary?.[500] || "#3498db", textDecorationLine: "underline" },
  guestsList: {
    borderWidth: 1,
    borderColor: colors.natural?.[200] || "#e3e8ee",
    borderRadius: 8,
    padding: 6,
    gap: 4,
    maxHeight: 280,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 6,
  },
  guestName: { ...textStyles.bodyMedium, color: colors.natural?.[800] || "#2c3e50" },
  guestPhone: { ...textStyles.caption, color: colors.natural?.[500] || "#7f8c8d" },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.natural?.[300] || "#d6dde2",
    borderRadius: 8,
  },
  dateBtnText: { ...textStyles.bodyMedium, color: colors.natural?.[800] || "#2c3e50" },
  quotaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f7f9fb",
    borderRadius: 8,
  },
  quotaOk: { color: "#1f6c3f", fontWeight: "600" },
  quotaBad: { color: "#c62828", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
});

export default ScheduleReminderSection;

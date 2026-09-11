import { colors, spacing } from "../../styles/tokens";
import EventActionDropdown, { EventActionItem } from "../events/EventActionDropdown";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import LocalizedText from "../commen/LocalizedText";
import TestMessageModal from "./TestMessageModal";
import ScheduleSendingModal from "./ScheduleSendingModal";
import { useNotifyStaff, useDeleteEvent } from "../../hooks/events/mutations/useEventMutation";
import { useToast } from "../../contexts/ToastContext";
import { useEventActionGate } from "@halaa/shared/hooks/useEventActionGate";
import { formatDateTime } from "@halaa/shared/utils/locale";
import { riyadhWallClockInstant } from "@halaa/shared/utils/schedulingWindow";


const EVENT_EDIT_STEPS = [
  { step: 1, labelKey: "home:lastEvent.dropdown.eventDetails" },
  { step: 2, labelKey: "home:lastEvent.dropdown.guestList" },
  { step: 3, labelKey: "home:lastEvent.dropdown.invitationDesign" },
  { step: 4, labelKey: "home:lastEvent.dropdown.invitationCustomization" },
];

const EventActionsHeader = ({ event, isAdmin = false, onDeleted, showAdminDelete = true }) => {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation(["events", "home"]);
  const toast = useToast();
  const [showTestModal, setShowTestModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  // Server flag wins as soon as fresh event data arrives (pull-to-refresh,
  // polling, remount). The local flag is only an optimistic bridge between
  // sending the test message in this session and the next successful refetch
  // — seeding `useState` from the prop once at mount left the button visible
  // forever when the component mounted on cached/stale data.
  const [optimisticTestSent, setOptimisticTestSent] = useState(false);
  const testMessageSent = !!(event?.testMessageSent || optimisticTestSent);
  const notifyStaffMutation = useNotifyStaff();
  const deleteEventMutation = useDeleteEvent();

  const eventId = event?.id || event?._id;
  useEffect(() => { setOptimisticTestSent(false); }, [eventId, event?.testMessageFingerprint]);
  const updateRoute = isAdmin ? "UpdateEvent" : "UpdateEventScreen";

  // Shared gate. Visibility rules require an active template before
  // test/schedule, and an actual staff entry before Notify Staff.
  const { canSendTest, canSchedule, canNotifyStaff, isCompleted } =
    useEventActionGate({ event, testMessageSent });
  const scheduledSendInstant = event?.launchSettings?.scheduledDate && event?.launchSettings?.scheduledTime
    ? riyadhWallClockInstant(event.launchSettings.scheduledDate, event.launchSettings.scheduledTime)
    : null;
  const scheduledSendText = scheduledSendInstant
    ? formatDateTime(scheduledSendInstant, i18n.language || "ar", { timeZone: "Asia/Riyadh" })
    : null;

  const handleEditStep = (step) => {
    if (!eventId) return;
    navigation.navigate(updateRoute, { eventId, step });
  };

  const handleNotifyStaff = async () => {
    if (!eventId) return;
    try {
      const result = await notifyStaffMutation.mutateAsync({ eventId });
      const data = result?.data || result;
      const sent = data?.sent || 0;
      const total = data?.total || 0;
      if (sent === 0) { toast.error(t("staff.notifyError")); return; }
      if (sent < total) { toast.error(t("staff.notifyPartial", { sent, total })); return; }
      toast.success(
        t("staff.notifySuccess", { sent: data?.sent || 0, total: data?.total || 0 }) ||
          `Sent to ${data?.sent || 0}/${data?.total || 0} staff`
      );
    } catch (error) {
      toast.error(error?.message || t("staff.notifyError", "Failed to notify staff"));
    }
  };

  const handleTestMessageSuccess = () => {
    setOptimisticTestSent(true);
    setShowTestModal(false);
  };

  const handleDelete = () => {
    if (!eventId) return;
    Alert.alert(
      t("eventDetails.deleteConfirmTitle", "حذف المناسبة"),
      t("eventDetails.deleteConfirmMessage", "هل أنت متأكد من حذف هذه المناسبة؟ لا يمكن التراجع عن هذا الإجراء."),
      [
        { text: t("guest.alerts.cancel", "إلغاء"), style: "cancel" },
        {
          text: t("guest.alerts.delete", "حذف"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEventMutation.mutateAsync(eventId);
              toast.success(t("eventDetails.deleted", "تم حذف المناسبة"));
              onDeleted?.();
            } catch (err) {
              toast.error(err?.message || t("eventDetails.deleteFailed", "تعذر حذف المناسبة"));
            }
          },
        },
      ]
    );
  };

  const hasAnyOutlineAction = canSendTest || canSchedule || canNotifyStaff || isCompleted;

  return (
    <>
      <View style={styles.container}>
        {hasAnyOutlineAction && (
          <View style={styles.actionsRow}>
            {canSendTest && (
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => setShowTestModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="paper-plane-outline" size={14} color="#6B4E33" />
                <Text style={styles.outlineButtonText}>
                  {t("testMessage.title", "رسالة تجريبية")}
                </Text>
              </TouchableOpacity>
            )}

            {canSchedule && (
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => setShowScheduleModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={14} color="#6B4E33" />
                <Text style={styles.outlineButtonText}>
                  {t("scheduleSend.title", "جدولة الإرسال")}
                </Text>
              </TouchableOpacity>
            )}

            {canNotifyStaff && (
              <TouchableOpacity
                style={[
                  styles.outlineButton,
                  notifyStaffMutation.isPending && styles.outlineButtonDisabled,
                ]}
                onPress={handleNotifyStaff}
                activeOpacity={0.7}
                disabled={notifyStaffMutation.isPending}
              >
                <Ionicons name="megaphone-outline" size={14} color="#6B4E33" />
                <Text style={styles.outlineButtonText}>
                  {notifyStaffMutation.isPending
                    ? t("staff.notifying", "جاري الإرسال...")
                    : t("staff.notifyStaff", "إشعار الطاقم")}
                </Text>
              </TouchableOpacity>
            )}

            {isCompleted && (
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => navigation.navigate("ManagePostEvent", { eventId })}
                activeOpacity={0.7}
              >
                <Ionicons name="share-social-outline" size={14} color="#6B4E33" />
                <Text style={styles.outlineButtonText}>
                  {t("postEvent.share", "مشاركة ما بعد المناسبة")}
                </Text>
              </TouchableOpacity>
            )}

          </View>
        )}

        {!isCompleted && <EventActionDropdown primary label={t("home:lastEvent.buttons.editEvent")} icon="create-outline" resetKey={eventId}>
          {(close) => EVENT_EDIT_STEPS.filter(item => event?.capabilities?.[{ 1: "canEditDetails", 2: "canAddGuest", 3: "canEditDesign", 4: "canEditMessages" }[item.step]] ?? ["pending_review", "pending_scheduling", "scheduled"].includes(event?.status)).map(item =>
            <EventActionItem key={item.step} label={t(item.labelKey)} icon="create-outline" onPress={() => { close(); handleEditStep(item.step); }} />)}
        </EventActionDropdown>}
        {isAdmin && showAdminDelete && <EventActionDropdown label={t("eventDetails.moreActions")} icon="ellipsis-horizontal">
          {(close) => <EventActionItem label={t("eventDetails.deleteEvent")} icon="trash-outline" destructive disabled={deleteEventMutation.isPending} onPress={() => { close(); handleDelete(); }} />}
        </EventActionDropdown>}
        {scheduledSendText ? (
          <View style={styles.scheduledNotice} accessibilityRole="text">
            <Ionicons name="calendar-outline" size={18} color="#8A5B31" />
            <LocalizedText style={styles.scheduledNoticeText}>
              {t("workflow.scheduledFor", { dateTime: scheduledSendText })}
            </LocalizedText>
          </View>
        ) : (canSendTest || canSchedule) && <LocalizedText role="body" style={styles.workflowHint}>{t(canSendTest ? "workflow.testFirst" : event?.status === "scheduled" ? "workflow.scheduled" : "workflow.scheduleNext")}</LocalizedText>}
      </View>

      <TestMessageModal
        visible={showTestModal}
        eventId={eventId}
        onClose={() => setShowTestModal(false)}
        onSuccess={handleTestMessageSuccess}
      />

      <ScheduleSendingModal
        visible={showScheduleModal}
        eventId={eventId}
        onClose={() => setShowScheduleModal(false)}
        existingSchedule={event?.launchSettings}
        eventDate={event?.eventDetails?.date || event?.date}
        eventTime={event?.eventDetails?.time || event?.time}
        eventIsTrial={event?.capabilities?.isTrial}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing[12], width: '100%' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  outlineButton: { flexGrow: 1, flexBasis: 150, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[8], padding: spacing[12], borderRadius: 12, borderWidth: 1, borderColor: colors.primary[200], backgroundColor: colors.natural[50] },
  outlineButtonText: { flexShrink: 1, fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: colors.primary[800] },
  outlineButtonDisabled: { opacity: 0.5 },
  workflowHint: { fontSize: 14, lineHeight: 23, color: colors.secondary[400] },
  scheduledNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[12], padding: spacing[12], borderRadius: 12, borderStartWidth: 3, borderStartColor: colors.primary[500], backgroundColor: colors.primary[50] },
  scheduledNoticeText: { flex: 1, fontSize: 13, lineHeight: 21, color: colors.primary[800] },
});

export default EventActionsHeader;

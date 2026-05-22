import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
// NOTE: `TestMessageModal` and `ScheduleSendingModal` each render their
// own RN `<Modal>` internally and accept a `visible` prop. Wrapping them
// in another `<Modal>` (as the original file did) double-stacks them,
// hides the inner modal because we never forward `visible`, and breaks
// keyboard focus on the phone input. We now mount the modal components
// directly and forward `visible` through.
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import TestMessageModal from "./TestMessageModal";
import ScheduleSendingModal from "./ScheduleSendingModal";
import { useNotifyStaff } from "../../hooks/mutations/useEventMutations";
import { useDeleteEvent } from "../../hooks/mutations/useEventCrudMutations";
import { useToast } from "../../contexts/ToastContext";

/**
 * Action bar shown on the single-event detail screen. Mirrors the web
 * `ui/host/events/EventActionsHeader.jsx` — same buttons, same gates,
 * same "Manage Event" dropdown with 4 edit steps. `isAdmin` toggles the
 * destructive Delete action and chooses the right stack route.
 *
 * Routes — host pushes "UpdateEventScreen" (registered in AppNavigator);
 * admin pushes "UpdateEvent" (registered in AdminNavigator). The legacy
 * "AdminUpdateEvent" name in this file was never registered, which is
 * why the Manage button silently no-op'd on admin and pushed the wrong
 * route on host.
 */
const EVENT_EDIT_STEPS = [
  { step: 1, labelKey: "lastEvent.dropdown.eventDetails", fallback: "تفاصيل المناسبة" },
  { step: 2, labelKey: "lastEvent.dropdown.guestList", fallback: "قائمة الضيوف" },
  { step: 3, labelKey: "lastEvent.dropdown.invitationDesign", fallback: "تصميم الدعوة" },
  { step: 4, labelKey: "lastEvent.dropdown.invitationCustomization", fallback: "تخصيص الدعوة" },
];

const EventActionsHeader = ({ event, isAdmin = false, onDeleted }) => {
  const navigation = useNavigation();
  const { t } = useTranslation(["events", "home"]);
  const toast = useToast();
  const [showTestModal, setShowTestModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [testMessageSent, setTestMessageSent] = useState(event?.testMessageSent || false);

  const notifyStaffMutation = useNotifyStaff();
  const deleteEventMutation = useDeleteEvent();

  const eventId = event?.id || event?._id;
  const updateRoute = isAdmin ? "UpdateEvent" : "UpdateEventScreen";

  // Compute gates locally (not via `useEventActionGate`) because that hook
  // requires `event.taqnyatTemplate?.templateRef` for both canSendTest and
  // canSchedule — and the host-side mobile payload doesn't always carry
  // that field, which silently disabled every button. We keep the
  // dependency order the user asked for (test first → schedule next) and
  // delegate template validation to the backend on submit.
  const status = event?.status;
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isLive = status === "live";
  const canSendTest = !isCompleted && !isFailed;
  const canSchedule = testMessageSent && !isLive && !isCompleted && !isFailed;
  const hasSupervisors = !isCompleted && !isFailed;

  const handleEditStep = (step) => {
    setShowManageMenu(false);
    if (!eventId) return;
    navigation.navigate(updateRoute, { eventId, step });
  };

  const handleNotifyStaff = async () => {
    if (!eventId) return;
    try {
      const result = await notifyStaffMutation.mutateAsync({ eventId });
      const data = result?.data || result;
      toast.success(
        t("staff.notifySuccess", { sent: data?.sent || 0, total: data?.total || 0 }) ||
          `Sent to ${data?.sent || 0}/${data?.total || 0} staff`
      );
    } catch (error) {
      toast.error(error?.message || t("staff.notifyError", "Failed to notify staff"));
    }
  };

  const handleTestMessageSuccess = () => {
    setTestMessageSent(true);
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

  return (
    <>
      <View style={styles.container}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.outlineButton, !canSendTest && styles.outlineButtonDisabled]}
            onPress={() => setShowTestModal(true)}
            activeOpacity={0.7}
            disabled={!canSendTest}
          >
            <Ionicons name="paper-plane-outline" size={14} color={canSendTest ? "#6B4E33" : "#B5A691"} />
            <Text style={[styles.outlineButtonText, !canSendTest && styles.outlineButtonTextDisabled]}>
              {t("testMessage.title", "رسالة تجريبية")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineButton, !canSchedule && styles.outlineButtonDisabled]}
            onPress={() => setShowScheduleModal(true)}
            activeOpacity={0.7}
            disabled={!canSchedule}
          >
            <Ionicons name="calendar-outline" size={14} color={canSchedule ? "#6B4E33" : "#B5A691"} />
            <Text style={[styles.outlineButtonText, !canSchedule && styles.outlineButtonTextDisabled]}>
              {t("scheduleSend.title", "جدولة الإرسال")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.outlineButton,
              (!hasSupervisors || notifyStaffMutation.isPending) && styles.outlineButtonDisabled,
            ]}
            onPress={handleNotifyStaff}
            activeOpacity={0.7}
            disabled={!hasSupervisors || notifyStaffMutation.isPending}
          >
            <Ionicons
              name="megaphone-outline"
              size={14}
              color={hasSupervisors ? "#6B4E33" : "#B5A691"}
            />
            <Text
              style={[
                styles.outlineButtonText,
                !hasSupervisors && styles.outlineButtonTextDisabled,
              ]}
            >
              {notifyStaffMutation.isPending
                ? t("staff.notifying", "جاري الإرسال...")
                : t("staff.notifyStaff", "إشعار الطاقم")}
            </Text>
          </TouchableOpacity>

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

        <View style={styles.primaryRow}>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => setShowManageMenu(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={14} color="#FFF" />
            <Text style={styles.manageButtonText}>{t("manageEvent", "إدارة المناسبة")}</Text>
            <Ionicons name="chevron-down" size={14} color="#FFF" />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.85}
              disabled={deleteEventMutation.isPending}
            >
              <Ionicons name="trash-outline" size={14} color="#FFF" />
              <Text style={styles.deleteButtonText}>
                {deleteEventMutation.isPending
                  ? t("common.loading", "جار التحميل...")
                  : t("eventDetails.deleteEvent", "حذف")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Manage Event dropdown (modal sheet — same 4 steps as the web header) */}
      <Modal
        visible={showManageMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManageMenu(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setShowManageMenu(false)}>
          <Pressable style={styles.menuCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.menuTitle}>{t("lastEvent.buttons.editEvent", "تعديل المناسبة")}</Text>
            {EVENT_EDIT_STEPS.map((item) => (
              <TouchableOpacity
                key={item.step}
                style={styles.menuItem}
                onPress={() => handleEditStep(item.step)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={16} color="#6B4E33" />
                <Text style={styles.menuItemText}>
                  {t(item.labelKey, item.fallback)}
                </Text>
                <Ionicons name="chevron-back" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={() => setShowManageMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuCloseText}>{t("guest.alerts.cancel", "إلغاء")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
  },
  outlineButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 16,
  },
  outlineButtonDisabled: {
    backgroundColor: "#FAF6F1",
    borderColor: "#E6D6C2",
    opacity: 0.65,
  },
  outlineButtonTextDisabled: {
    color: "#B5A691",
  },
  primaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  manageButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  manageButtonText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C0392B",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 18,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  menuCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    paddingHorizontal: 8,
    paddingVertical: 10,
    textAlign: "right",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FAF6F1",
  },
  menuItemText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    textAlign: "right",
  },
  menuCloseButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  menuCloseText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#9CA3AF",
  },
});

export default EventActionsHeader;

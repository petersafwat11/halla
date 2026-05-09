import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import TestMessageModal from "./TestMessageModal";
import ScheduleSendingModal from "./ScheduleSendingModal";
import { useNotifyStaff } from "../../hooks/mutations/useEventMutations";
import { useToast } from "../../contexts/ToastContext";
import useEventActionGate from "../../hooks/useEventActionGate";

const EventActionsHeader = ({ event, isAdmin = false }) => {
  const navigation = useNavigation();
  const { t } = useTranslation("events");
  const toast = useToast();
  const [showTestModal, setShowTestModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [testMessageSent, setTestMessageSent] = useState(event?.testMessageSent || false);

  const notifyStaffMutation = useNotifyStaff();

  // Gate logic lives in `useEventActionGate` (mobile companion of the
  // web hook). Both surfaces read from `taqnyatTemplate.templateRef`
  // so the web header, dashboard widget, and this header stay in lock-step.
  const { canSendTest, canSchedule, hasStaff: hasSupervisors, isCompleted } =
    useEventActionGate({ event, testMessageSent });

  const handleManagePress = () => {
    const screen = isAdmin ? "AdminUpdateEvent" : "UpdateEvent";
    navigation.navigate(screen, { eventId: event?.id });
  };

  const handleNotifyStaff = async () => {
    if (!event?.id) return;
    try {
      const result = await notifyStaffMutation.mutateAsync({ eventId: event.id });
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

  return (
    <>
      <View style={styles.container}>
        <View style={styles.actionButtonsRow}>
          {canSendTest && (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => setShowTestModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.outlineButtonText}>{t("testMessage.title", "Test Message")}</Text>
            </TouchableOpacity>
          )}
          {canSchedule && (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => setShowScheduleModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.outlineButtonText}>{t("scheduleSend.title", "Schedule Event")}</Text>
            </TouchableOpacity>
          )}
          {hasSupervisors && (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={handleNotifyStaff}
              activeOpacity={0.7}
              disabled={notifyStaffMutation.isPending}
            >
              <Text style={styles.outlineButtonText}>
                {notifyStaffMutation.isPending
                  ? t("staff.notifying", "Sending...")
                  : t("staff.notifyStaff", "Notify Staff")}
              </Text>
            </TouchableOpacity>
          )}
          {isCompleted && (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => navigation.navigate("HostPostEvent", { eventId: event?.id || event?._id })}
              activeOpacity={0.7}
            >
              <Text style={styles.outlineButtonText}>
                {t("postEvent.share", "مشاركة ما بعد المناسبة")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.manageButton} onPress={handleManagePress} activeOpacity={0.7}>
          <Text style={styles.manageButtonText}>{t("manageEvent", "Manage Event")}</Text>
          <Ionicons name="settings-outline" size={12} color="#FFF" />
        </TouchableOpacity>
      </View>

      <Modal visible={showTestModal} transparent animationType="slide" onRequestClose={() => setShowTestModal(false)}>
        <TestMessageModal
          eventId={event?.id}
          onClose={() => setShowTestModal(false)}
          onSuccess={handleTestMessageSuccess}
        />
      </Modal>

      <Modal visible={showScheduleModal} transparent animationType="slide" onRequestClose={() => setShowScheduleModal(false)}>
        <ScheduleSendingModal
          eventId={event?.id}
          onClose={() => setShowScheduleModal(false)}
          existingSchedule={event?.launchSettings}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  outlineButton: {
    flex: 1,
    minWidth: 70,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
  },
  outlineButtonText: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 16,
  },
  manageButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#C28E5C",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    height: 32,
  },
  manageButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 16,
    letterSpacing: 0.06,
  },
});

export default EventActionsHeader;

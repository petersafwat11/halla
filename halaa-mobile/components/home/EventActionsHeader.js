import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Alert, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import DirectionalIonicon from "../common/DirectionalIonicon";
import TestMessageModal from "./TestMessageModal";
import ScheduleSendingModal from "./ScheduleSendingModal";
import { useNotifyStaff, useDeleteEvent } from "../../hooks/events/mutations/useEventMutation";
import { useToast } from "../../contexts/ToastContext";
import { useEventActionGate } from "@halaa/shared/hooks/useEventActionGate";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const EVENT_EDIT_STEPS = [
  { step: 1, labelKey: "home:lastEvent.dropdown.eventDetails" },
  { step: 2, labelKey: "home:lastEvent.dropdown.guestList" },
  { step: 3, labelKey: "home:lastEvent.dropdown.invitationDesign" },
  { step: 4, labelKey: "home:lastEvent.dropdown.invitationCustomization" },
];

const EventActionsHeader = ({ event, isAdmin = false, onDeleted, showAdminDelete = true }) => {
  const navigation = useNavigation();
  const { t } = useTranslation(["events", "home"]);
  const toast = useToast();
  const [showTestModal, setShowTestModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [testMessageSent, setTestMessageSent] = useState(event?.testMessageSent || false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1150,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1150,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const flashingStyle = {
    backgroundColor: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["#FFFFFF", "#FAF0E6"],
    }),
    borderColor: pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["#D6B392", "#C28E5C"],
    }),
  };

  const notifyStaffMutation = useNotifyStaff();
  const deleteEventMutation = useDeleteEvent();

  const eventId = event?.id || event?._id;
  const updateRoute = isAdmin ? "UpdateEvent" : "UpdateEventScreen";

  // Shared gate. Visibility rules require an active template before
  // test/schedule, and an actual staff entry before Notify Staff.
  const { canSendTest, canSchedule, hasStaff, isCompleted } =
    useEventActionGate({ event, testMessageSent });

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

  const hasAnyOutlineAction = canSendTest || canSchedule || hasStaff || isCompleted;

  return (
    <>
      <View style={styles.container}>
        {hasAnyOutlineAction && (
          <View style={styles.actionsRow}>
            {canSendTest && (
              <AnimatedTouchableOpacity
                style={[styles.outlineButton, flashingStyle]}
                onPress={() => setShowTestModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="paper-plane-outline" size={14} color="#6B4E33" />
                <Text style={styles.outlineButtonText}>
                  {t("testMessage.title", "رسالة تجريبية")}
                </Text>
              </AnimatedTouchableOpacity>
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

            {hasStaff && (
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

        <View style={styles.primaryRow}>
          {!isCompleted && (
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => setShowManageMenu(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={14} color="#FFF" />
              <Text style={styles.manageButtonText}>{t("manageEvent", "إدارة المناسبة")}</Text>
              <Ionicons name="chevron-down" size={14} color="#FFF" />
            </TouchableOpacity>
          )}

          {isAdmin && showAdminDelete && (
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
                  {t(item.labelKey)}
                </Text>
                <DirectionalIonicon name="chevron-forward" size={14} color="#9CA3AF" />
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
        eventDate={event?.eventDetails?.date || event?.date}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: "100%",
  },
  actionsRow: {
    flexDirection: "column",
    gap: 8,
    width: "100%",
  },
  outlineButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
    height: 40,
  },
  outlineButtonText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 18,
  },
  outlineButtonDisabled: {
    backgroundColor: "#FAF6F1",
    borderColor: "#E6D6C2",
    opacity: 0.65,
  },
  primaryRow: {
    flexDirection: "column",
    gap: 8,
    width: "100%",
  },
  manageButton: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 10,
    borderRadius: 8,
    height: 40,
  },
  manageButtonText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 18,
  },
  deleteButton: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C0392B",
    paddingVertical: 10,
    borderRadius: 8,
    height: 40,
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

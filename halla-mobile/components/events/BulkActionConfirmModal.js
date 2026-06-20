import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "../../localization";

/**
 * Confirmation modal for the pool-charged guest-list bulk actions
 * (resend invitation / extra reminder). Mirrors the web
 * `BulkActionConfirmModal`. Shows the cost summary —
 * "Will send to N · costs N invites · M remaining" — and disables the confirm
 * button when the selection exceeds the host's remaining invites
 * (`null` remaining = truly unlimited, never blocked).
 *
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {"resend"|"extraReminder"|null} props.type
 * @param {number} props.count - number of eligible guests the action will send to
 * @param {number|null} props.invitesRemaining - null = unlimited
 * @param {boolean} [props.isLoading]
 * @param {Function} props.onConfirm
 * @param {Function} props.onClose
 */
export default function BulkActionConfirmModal({
  visible,
  type,
  count,
  invitesRemaining,
  isLoading = false,
  onConfirm,
  onClose,
}) {
  const { t } = useTranslation(["events"]);

  const isUnlimited = invitesRemaining == null;
  const overQuota = !isUnlimited && count > invitesRemaining;
  const remainingDisplay = isUnlimited
    ? t("events:bulkActions.unlimited", "غير محدود")
    : invitesRemaining;

  const title =
    type === "resend"
      ? t("events:bulkActions.resendTitle", "إعادة إرسال الدعوة")
      : t("events:bulkActions.extraReminderTitle", "تذكير إضافي");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.summary}>
            {t("events:bulkActions.costSummary", {
              defaultValue:
                "سيتم الإرسال إلى {{count}} · يكلف {{count}} دعوة · {{remaining}} متبقية",
              count,
              remaining: remainingDisplay,
            })}
          </Text>

          {overQuota ? (
            <Text style={styles.warning}>
              {t(
                "events:bulkActions.insufficientInvites",
                "لا يوجد رصيد كافٍ من الدعوات — اشترِ المزيد من الباقات."
              )}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onClose}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>
                {t("events:bulkActions.cancel", "إلغاء")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                (isLoading || overQuota) && styles.btnDisabled,
              ]}
              onPress={onConfirm}
              disabled={isLoading || overQuota}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.confirmText}>
                  {t("events:bulkActions.send", "إرسال")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "right",
  },
  summary: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    lineHeight: 20,
    textAlign: "right",
  },
  warning: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#C0392B",
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFF",
  },
  confirmBtn: {
    backgroundColor: "#C28E5C",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#656565",
  },
  confirmText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
});

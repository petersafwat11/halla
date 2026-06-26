import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import {
  useResendInvite,
  useExtraReminder,
  useSendNewGuests,
} from "../../hooks/events/mutations/useEventMutation";
import { computeSendAudiences, guestKey } from "./sendAudiences";

const TITLE_KEYS = {
  newGuests: ["events:sendActions.items.newGuests", "إرسال دعوة للضيوف الجدد"],
  resend: ["events:bulkActions.resendTitle", "إعادة إرسال الدعوة"],
  extraReminder: ["events:bulkActions.extraReminderTitle", "تذكير إضافي"],
};

/**
 * Shared confirm modal for the three pool-charged send actions. Lists the
 * action's target guests with select-all checkboxes (default all), a live
 * "N selected · M invites left" counter, a cost line, and a locking Send
 * button. Owns the three mutations; the backend re-filters the audience so
 * unchecking only narrows.
 */
export default function SendActionModal({
  visible,
  action,
  eventId,
  guests,
  invitesRemaining,
  onClose,
}) {
  const { t } = useTranslation(["events"]);
  const toast = useToast();

  const resendMut = useResendInvite();
  const reminderMut = useExtraReminder();
  const newGuestsMut = useSendNewGuests();

  const audiences = useMemo(() => computeSendAudiences(guests), [guests]);
  const audience = action ? audiences[action] || [] : [];

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // (Re)initialise selection to "all" when the modal opens or the action
  // switches. Not on audience changes, so a background refetch can't wipe a
  // host's manual de-selection.
  useEffect(() => {
    if (visible) setSelectedIds(new Set(audience.map(guestKey)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, action]);

  const mutation =
    action === "resend"
      ? resendMut
      : action === "extraReminder"
        ? reminderMut
        : newGuestsMut;
  const isPending = mutation.isPending;

  const isUnlimited = invitesRemaining == null;
  const selectedCount = selectedIds.size;
  const overQuota = !isUnlimited && selectedCount > invitesRemaining;
  const canSend = selectedCount > 0 && !overQuota && !isPending;
  const allSelected = audience.length > 0 && selectedCount === audience.length;

  const [titleKey, titleFallback] = TITLE_KEYS[action] || TITLE_KEYS.newGuests;

  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(audience.map(guestKey)));

  const toggleOne = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const counterText = isUnlimited
    ? t("events:sendActions.popup.counterUnlimited", {
        defaultValue: "{{count}} محدد",
        count: selectedCount,
      })
    : t("events:sendActions.popup.counter", {
        defaultValue: "{{count}} محدد · {{remaining}} دعوة متبقية",
        count: selectedCount,
        remaining: invitesRemaining,
      });

  const costText = isUnlimited
    ? t("events:sendActions.popup.costUnlimited", {
        defaultValue: "سيُرسل هذا {{count}} رسالة.",
        count: selectedCount,
      })
    : t("events:sendActions.popup.cost", {
        defaultValue: "سيُرسل هذا {{count}} رسالة ويستهلك {{count}} دعوة.",
        count: selectedCount,
      });

  const handleSend = async () => {
    const guestIds = [...selectedIds];
    if (guestIds.length === 0) return;
    try {
      const result = await mutation.mutateAsync({ eventId, guestIds });
      const data = result?.data || result || {};
      const total = data.reminded ?? guestIds.length;

      if (total === 0) {
        if (data.code === "SEND_INVITES_FIRST") {
          toast.error(
            t(
              "events:bulkActions.sendInvitesFirst",
              "أرسِل الدعوات الأولية أولًا، ثم استخدم إعادة الإرسال لمن لم يردّ أو اختار ربما."
            )
          );
        } else if (data.code === "NO_NEW_GUESTS") {
          toast.info(
            t("events:sendActions.noNewGuestsToast", "لا يوجد ضيوف جدد لإرسال الدعوات إليهم.")
          );
        } else {
          toast.info(
            t(
              action === "extraReminder"
                ? "events:bulkActions.noConfirmedNow"
                : "events:bulkActions.noEligibleNow",
              action === "extraReminder"
                ? "لا يوجد ضيوف مؤكدون للتذكير بعد."
                : "لقد ردّ الجميع — لا يوجد من يمكن إعادة دعوته."
            )
          );
        }
        onClose();
        return;
      }

      const successful = data.successful ?? guestIds.length;
      toast.success(
        t("events:bulkActions.sentResult", {
          defaultValue: "{{successful}}/{{total}} تم الإرسال",
          successful,
          total,
        })
      );
      onClose();
    } catch (error) {
      if (error?.code === "INSUFFICIENT_INVITES" || error?.status === 402) {
        toast.error(
          t(
            "events:bulkActions.insufficientInvites",
            "لا يوجد رصيد كافٍ من الدعوات — اشترِ المزيد من الباقات."
          )
        );
      } else if (error?.code === "NO_REMINDER_TEMPLATE") {
        toast.error(
          t(
            "events:bulkActions.noReminderTemplate",
            "لا يوجد قالب تذكير مُعد لهذه الفئة. تواصل مع الدعم."
          )
        );
      } else if (error?.status === 403) {
        toast.error(
          t(
            "events:sendActions.expired",
            "انتهت صلاحية باقة هذه المناسبة أو لم يعد الإرسال متاحًا."
          )
        );
      } else {
        toast.error(error?.message || t("events:bulkActions.error", "تعذّر إتمام العملية"));
      }
    }
  };

  const renderRow = ({ item }) => {
    const id = guestKey(item);
    const checked = selectedIds.has(id);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => toggleOne(id)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={checked ? "checkbox" : "square-outline"}
          size={20}
          color={checked ? "#C28E5C" : "#9CA3AF"}
        />
        <View style={styles.rowText}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name || "-"}
          </Text>
          <Text style={styles.rowPhone} numberOfLines={1}>
            {item.phone || "-"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={!!visible && !!action}
      transparent
      animationType="slide"
      onRequestClose={isPending ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t(titleKey, titleFallback)}</Text>

          {audience.length === 0 ? (
            <Text style={styles.empty}>
              {t("events:sendActions.popup.empty", "لا يوجد ضيوف مطابقون لهذا الإجراء.")}
            </Text>
          ) : (
            <>
              <TouchableOpacity
                style={styles.selectAllRow}
                onPress={toggleAll}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={allSelected ? "checkbox" : "square-outline"}
                  size={20}
                  color={allSelected ? "#C28E5C" : "#9CA3AF"}
                />
                <Text style={styles.selectAllText}>
                  {t("events:sendActions.popup.selectAll", "تحديد الكل")}
                </Text>
              </TouchableOpacity>

              <FlatList
                data={audience}
                keyExtractor={guestKey}
                renderItem={renderRow}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
              />

              <Text style={styles.counter}>{counterText}</Text>
              <Text style={styles.cost}>{costText}</Text>
              {overQuota ? (
                <Text style={styles.warning}>
                  {t(
                    "events:bulkActions.insufficientInvites",
                    "لا يوجد رصيد كافٍ من الدعوات — اشترِ المزيد من الباقات."
                  )}
                </Text>
              ) : null}
            </>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onClose}
              disabled={isPending}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>
                {t("events:bulkActions.cancel", "إلغاء")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn, !canSend && styles.btnDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.8}
            >
              {isPending ? (
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
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    gap: 12,
    maxHeight: "85%",
  },
  title: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  empty: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
    paddingVertical: 16,
    textAlign: "center",
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E9E0",
  },
  selectAllText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F6F6F6",
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
  },
  rowPhone: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#9CA3AF",
    writingDirection: "ltr",
  },
  counter: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginTop: 4,
  },
  cost: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
  },
  warning: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#C0392B",
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

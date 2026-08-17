import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import {
  SEND_ACTIONS,
  computeSendAudiences,
  buildSendActionStates,
} from "./sendAudiences";

const ITEM = {
  newGuests: {
    icon: "person-add-outline",
    labelKey: ["events:sendActions.items.newGuests", "إرسال دعوة للضيوف الجدد"],
  },
  resend: {
    icon: "paper-plane-outline",
    labelKey: ["events:sendActions.items.resend", "إعادة إرسال الدعوة"],
  },
  extraReminder: {
    icon: "notifications-outline",
    labelKey: ["events:sendActions.items.extraReminder", "تذكير إضافي"],
  },
};
const DISABLED_KEYS = {
  sendFirst: ["events:sendActions.disabled.sendFirst", "أرسِل الدعوات الأولية أولًا"],
  noNewGuests: ["events:sendActions.disabled.noNewGuests", "لا يوجد ضيوف جدد للإرسال إليهم"],
  noResend: ["events:sendActions.disabled.noResend", "ردّ الجميع بالفعل"],
  noConfirmed: ["events:sendActions.disabled.noConfirmed", "لا يوجد ضيوف مؤكدون بعد"],
};

/**
 * Bottom action sheet listing the three pool-charged send actions, each with
 * its target count or a disable reason. Selecting an enabled action calls
 * `onPick(action)` (which opens the shared SendActionModal).
 */
export default function SendActionsSheet({ visible, event, guests, onPick, onClose }) {
  const { t } = useTranslation(["events"]);

  const states = useMemo(
    () => buildSendActionStates(event, computeSendAudiences(guests)),
    [event, guests]
  );

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.title}>{t("events:sendActions.menu", "إرسال الرسائل")}</Text>

          {SEND_ACTIONS.map((action) => {
            const state = states[action];
            const meta = ITEM[action];
            const reason = state.reasonKey ? t(...DISABLED_KEYS[state.reasonKey]) : null;
            return (
              <TouchableOpacity
                key={action}
                style={[styles.item, !state.enabled && styles.itemDisabled]}
                onPress={() => state.enabled && onPick(action)}
                disabled={!state.enabled}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={meta.icon}
                  size={18}
                  color={state.enabled ? "#6B4E33" : "#BCAEA0"}
                />
                <Text
                  style={[styles.itemText, !state.enabled && styles.itemTextDisabled]}
                  numberOfLines={1}
                >
                  {t(...meta.labelKey)}
                </Text>
                {state.enabled ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{state.audience.length}</Text>
                  </View>
                ) : (
                  <Text style={styles.reason} numberOfLines={1}>
                    {reason}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>{t("events:bulkActions.cancel", "إلغاء")}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 28,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FAF6F1",
  },
  itemDisabled: {
    backgroundColor: "#F5F5F5",
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
  },
  itemTextDisabled: {
    color: "#9CA3AF",
  },
  countBadge: {
    minWidth: 24,
    paddingHorizontal: 7,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F1E1CF",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    color: "#6B4E33",
  },
  reason: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#B08968",
    maxWidth: 140,
    textAlign: "left",
  },
  cancelBtn: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#9CA3AF",
  },
});

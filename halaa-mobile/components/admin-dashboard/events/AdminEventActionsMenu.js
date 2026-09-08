import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EventActionsSection from "./EventActionsSection";
import EventActionRow from "./EventActionRow";

export default function AdminEventActionsMenu({ onManageStaff, ...props }) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { t, updatePending, deletePending, onStatusChange, onDelete } = props;
  const busy = updatePending || deletePending;
  const close = () => setVisible(false);
  const run = (action) => (...args) => { close(); action(...args); };

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t("eventDetails.moreActions")}
      accessibilityState={{ expanded: visible, disabled: busy }} disabled={busy}
      onPress={() => setVisible(true)} style={styles.trigger}>
      <Ionicons name="ellipsis-horizontal" size={20} color="#6B4E33" />
      <Text style={styles.triggerText}>{t("eventDetails.moreActions")}</Text>
      <Ionicons name="chevron-down" size={16} color="#6B4E33" />
    </Pressable>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t("eventDetails.closeActions")} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.heading}>
            <Text style={styles.title}>{t("eventDetails.moreActions")}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t("eventDetails.closeActions")} onPress={close} style={styles.close}>
              <Ionicons name="close" size={24} color="#6B4E33" />
            </Pressable>
          </View>
          <ScrollView>
            <EventActionRow icon="people-outline" iconBg="#FAF6F1" iconColor="#6B4E33"
              label={t("eventDetails.manageStaff")} sublabel={t("eventDetails.manageStaffHint")}
              onPress={run(onManageStaff)} loading={busy} />
            <EventActionsSection {...props} updatePending={busy} deletePending={busy}
              onStatusChange={run(onStatusChange)} onDelete={run(onDelete)} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { minHeight: 48, borderWidth: 1, borderColor: "#D6B392", borderRadius: 10, backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16, marginTop: 8 },
  triggerText: { fontFamily: "Cairo_600SemiBold", fontSize: 14, color: "#6B4E33" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFF", borderTopStartRadius: 24, borderTopEndRadius: 24, maxHeight: "85%", width: "100%", maxWidth: 600, alignSelf: "center" },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingStart: 20, paddingEnd: 8, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: "#F0E9E1" },
  title: { fontFamily: "Cairo_700Bold", fontSize: 18, color: "#2C2C2C", flex: 1 },
  close: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
});

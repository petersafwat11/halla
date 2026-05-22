import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, ActivityIndicator, Switch, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { backgrounds, colors, spacing, borderRadius, typography, textStyles } from "../../../styles/tokens";

const ApproveWhitelabelDialog = ({ visible, onClose, onConfirm, isPending = false, whitelabel = null }) => {
  const { t } = useTranslation("admin");
  const [dispatchSetupEmail, setDispatchSetupEmail] = useState(true);

  const wlData = whitelabel?.profile?.whitelabelData || whitelabel?.roleData || whitelabel?.whitelabelData || {};
  const displayName = wlData.arabicName || whitelabel?.username || whitelabel?.email || "—";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={isPending ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <View style={styles.iconBubble}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success[500]} />
              </View>
              <Text style={styles.title}>{t("whitelabelDetails.approveDialog.title")}</Text>
            </View>

            <Text style={styles.bodyText}>{t("whitelabelDetails.approveDialog.body")}</Text>

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t("whitelabelDetails.approveDialog.platform")}</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>{displayName}</Text>
              </View>
              {whitelabel?.email ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t("whitelabelDetails.approveDialog.email")}</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{whitelabel.email}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: spacing[8] }}>
                <Text style={styles.toggleLabel}>{t("whitelabelDetails.approveDialog.dispatchEmail")}</Text>
                <Text style={styles.toggleHint}>{t("whitelabelDetails.approveDialog.dispatchEmailHint")}</Text>
              </View>
              <Switch
                value={dispatchSetupEmail}
                onValueChange={setDispatchSetupEmail}
                disabled={isPending}
                trackColor={{ false: colors.natural[200], true: `${colors.success[500]}60` }}
                thumbColor={dispatchSetupEmail ? colors.success[500] : colors.natural[400]}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose} disabled={isPending} activeOpacity={0.7}>
                <Text style={styles.btnCancelText}>{t("whitelabelDetails.approveDialog.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnConfirm, isPending && styles.btnDisabled]}
                onPress={() => onConfirm({ dispatchSetupEmail })}
                disabled={isPending}
                activeOpacity={0.7}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnConfirmText}>
                    {dispatchSetupEmail
                      ? t("whitelabelDetails.approveDialog.confirm")
                      : t("whitelabelDetails.approveDialog.confirmNoEmail")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: spacing[20] },
  sheet: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[16],
    maxHeight: "85%",
    overflow: "hidden",
  },
  body: { padding: spacing[20], gap: spacing[16] },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing[12] },
  iconBubble: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.success[50],
    alignItems: "center", justifyContent: "center",
  },
  title: { ...textStyles.titleMedium, color: colors.natural[900], flex: 1 },
  bodyText: { fontSize: typography.fontSize.body.medium, color: colors.natural[700], lineHeight: 22 },
  summary: {
    backgroundColor: colors.natural[100],
    borderRadius: borderRadius[12],
    padding: spacing[12],
    gap: spacing[6],
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing[8] },
  summaryLabel: { fontSize: typography.fontSize.label.small, color: colors.natural[450], fontWeight: typography.fontWeight.semibold },
  summaryValue: { fontSize: typography.fontSize.body.small, color: colors.natural[900], flex: 1, textAlign: "right" },
  toggleRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingVertical: spacing[8],
  },
  toggleLabel: { fontSize: typography.fontSize.body.medium, color: colors.natural[900], fontWeight: typography.fontWeight.semibold },
  toggleHint: { fontSize: typography.fontSize.label.small, color: colors.natural[400], marginTop: spacing[4], lineHeight: 18 },
  actions: { flexDirection: "row", gap: spacing[8], marginTop: spacing[8] },
  btn: { flex: 1, paddingVertical: spacing[12], borderRadius: borderRadius[10], alignItems: "center", justifyContent: "center" },
  btnCancel: { backgroundColor: colors.natural[100], borderWidth: 1, borderColor: colors.natural[200] },
  btnCancelText: { fontSize: typography.fontSize.body.medium, color: colors.natural[700], fontWeight: typography.fontWeight.semibold },
  btnConfirm: { backgroundColor: colors.success[500] },
  btnDisabled: { opacity: 0.7 },
  btnConfirmText: { fontSize: typography.fontSize.body.medium, color: "#fff", fontWeight: typography.fontWeight.semibold },
});

export default ApproveWhitelabelDialog;

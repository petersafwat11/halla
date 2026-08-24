/**
 * PurchaseStatusModal — renders the deterministic states of a native purchase
 * (usePurchaseFlow status) with localized AR/EN copy and status-tone colors.
 *
 * Success is shown ONLY when the exact attempted purchase reconciled to
 * active|fulfilled|consumed. `pending` shows a processing state with a manual
 * Refresh (never a false success). manual_review / refund_required show a
 * support-oriented message. A store cancellation dismisses silently.
 */

import React from "react";
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LocalizedText from "../commen/LocalizedText";
import { STATUS_TONES } from "../../constants/statusColors";
import { mapReconcileState, needsSupportAttention } from "../../services/billing/reconcileState";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

const TONE_ICON = {
  success: "checkmark-circle",
  warning: "time-outline",
  danger: "close-circle",
  info: "information-circle",
  neutral: "ellipse-outline",
};

// Whether the modal should be visible for a given flow phase.
const VISIBLE_PHASES = new Set(["preflight", "purchasing", "reconciling", "done", "blocked", "error"]);

function bodyFor(status, t) {
  const { phase } = status;
  if (phase === "preflight") return { tone: "info", busy: true, title: t("iapFlow.checking"), body: null };
  if (phase === "purchasing") return { tone: "info", busy: true, title: t("iapFlow.purchasing"), body: null };
  if (phase === "error") {
    return { tone: "danger", busy: false, title: t("iapStates.failed.title"), body: t("iapFlow.errorGeneric") };
  }
  if (phase === "blocked") {
    const reason = status.preflight?.reason || "ineligible";
    const action = status.preflight?.replacementAction || null;
    return {
      tone: "warning",
      busy: false,
      title: t("iapFlow.blockedTitle"),
      body: t(`preflight.${reason}`, t("preflight.ineligible")),
      action: action ? t(`replacementActions.${action}`, "") : "",
    };
  }
  // Deferred change (downgrade effective next renewal) — a scheduled success.
  if (status.state === "scheduled") {
    return { tone: "success", busy: false, title: t("iapFlow.scheduledTitle"), body: t("iapFlow.scheduledBody"), success: true };
  }
  // reconciling / done → derive from the reconcile state
  const state = status.state || "pending";
  const m = mapReconcileState(state);
  if (phase === "reconciling" && !m.terminal) {
    return {
      tone: "warning",
      busy: true,
      title: t("iapStates.pending.title"),
      body:
        status.reason === "reconcile_unavailable"
          ? t("iapFlow.reconcileUnavailable")
          : t("iapStates.pending.body"),
    };
  }
  return {
    tone: m.tone,
    busy: false,
    title: t(`iapStates.${m.category}.title`),
    body:
      !m.terminal && status.reason === "reconcile_unavailable"
        ? t("iapFlow.reconcileUnavailable")
        : t(`iapStates.${m.category}.body`),
    success: m.success,
    pending: !m.terminal,
    support: needsSupportAttention(state),
  };
}

const PurchaseStatusModal = ({ status, t, onClose, onRefresh, onSuccessContinue }) => {
  const visible = !!status && VISIBLE_PHASES.has(status.phase);
  if (!visible) return null;

  const info = bodyFor(status, t);
  const toneColors = STATUS_TONES[info.tone] || STATUS_TONES.neutral;
  const isTerminal = status.phase === "done" || status.phase === "blocked" || status.phase === "error";
  const showRefresh = status.phase === "done" && info.pending && !!onRefresh;
  const showContinue = status.phase === "done" && info.success && !!onSuccessContinue;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={isTerminal ? onClose : undefined}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: toneColors.bg }]}>
            {info.busy ? (
              <ActivityIndicator size="large" color={toneColors.fg} />
            ) : (
              <Ionicons name={TONE_ICON[info.tone] || "ellipse-outline"} size={40} color={toneColors.fg} />
            )}
          </View>

          <LocalizedText center style={styles.title}>{info.title}</LocalizedText>
          {!!info.body && <LocalizedText center style={styles.body}>{info.body}</LocalizedText>}
          {!!info.action && <LocalizedText center style={[styles.body, styles.action]}>{info.action}</LocalizedText>}

          {status.phase === "reconciling" && !!status.attempt && (
            <LocalizedText center style={styles.hint}>{t("iapFlow.pendingHint")}</LocalizedText>
          )}

          <View style={styles.actions}>
            {showContinue && (
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onSuccessContinue} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>{t("iapFlow.continue")}</Text>
              </TouchableOpacity>
            )}
            {showRefresh && (
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onRefresh} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>{t("iapFlow.refresh")}</Text>
              </TouchableOpacity>
            )}
            {isTerminal && !info.success && (
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.btnGhostText}>{t("iapFlow.close")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[24],
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    padding: spacing[24],
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[16],
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[900],
    textAlign: "center",
    marginBottom: spacing[8],
  },
  body: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    textAlign: "center",
    lineHeight: 20,
  },
  action: {
    marginTop: spacing[6],
    fontFamily: "Cairo_600SemiBold",
    color: colors.primary[600],
  },
  hint: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    textAlign: "center",
    marginTop: spacing[8],
  },
  actions: {
    width: "100%",
    marginTop: spacing[20],
    gap: spacing[8],
  },
  btn: {
    paddingVertical: spacing[12],
    borderRadius: borderRadius[12],
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: colors.primary[500],
  },
  btnPrimaryText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[50],
  },
  btnGhost: {
    backgroundColor: colors.natural[100],
  },
  btnGhostText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[900],
  },
});

export default PurchaseStatusModal;

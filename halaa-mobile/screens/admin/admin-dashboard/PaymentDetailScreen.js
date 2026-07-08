/**
 * Read-only payment detail surface for admins.
 *
 * RBAC: only super_admin / admin see write actions. Status-aware visibility
 * gates further:
 *   - capture / void  → only when status === "authorized"
 *   - refund          → only when status ∈ {paid, captured, partially_refunded}
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAdminPaymentById,
  useAdminPaymentRefund,
  useAdminPaymentCapture,
  useAdminPaymentVoid,
} from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import TopBar from "../../../components/plans/TopBar";
import StatusBadge from "../../../components/admin-dashboard/common/StatusBadge";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const ADMIN_WRITE_ROLES = new Set(["super_admin", "admin"]);

// Status-aware action gating mirrors what the backend will accept. Better
// to hide the button than let the user issue a request that's guaranteed
// to 422.
const REFUNDABLE = new Set(["paid", "captured", "partially_refunded"]);
const VOIDABLE = new Set(["authorized"]);
const CAPTURABLE = new Set(["authorized"]);

// Mobile RN doesn't reliably ship `crypto.randomUUID`; use the same
// fallback shape the rest of the codebase uses (checkoutService.js).
const newIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString() : "—";

const formatAmount = (amount, currency = "SAR") =>
  amount === undefined || amount === null ? "—" : `${amount} ${currency}`;

const Row = ({ label, value, mono = false }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={2}>
      {value || "—"}
    </Text>
  </View>
);

const PaymentDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { paymentId } = route.params || {};
  const { t } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const canWrite = ADMIN_WRITE_ROLES.has(role);

  const { data, isLoading, error, refetch } = useAdminPaymentById(paymentId);
  const refund = useAdminPaymentRefund();
  const capture = useAdminPaymentCapture();
  const voidMutation = useAdminPaymentVoid();

  const [actionType, setActionType] = useState(null); // "refund" | "capture" | "void"
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [deductInvites, setDeductInvites] = useState("");

  // Re-mounting the modal mints a fresh key; double-submit from the same
  // modal reuses it so the backend dedupes.
  const idempotencyKey = useMemo(
    () => (actionType ? newIdempotencyKey() : null),
    [actionType, paymentId],
  );

  // The service envelope is `{ success, data: { data: payment } }` because
  // sendSuccess wraps the controller payload again.
  const payment = data?.data || data || null;

  const remainingAmount = payment
    ? payment.amount - (payment.refundedAmount || 0)
    : 0;

  const status = payment?.status;
  const showRefund = canWrite && REFUNDABLE.has(status);
  const showCapture = canWrite && CAPTURABLE.has(status);
  const showVoid = canWrite && VOIDABLE.has(status);

  // A partial refund = an explicit amount that's > 0 and below the remaining
  // refundable amount. Only then do we offer the optional deductInvites input.
  const numericAmount = amount ? Number(amount) : NaN;
  const isPartialRefund =
    actionType === "refund" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount < remainingAmount;

  const closeModal = () => {
    setActionType(null);
    setAmount("");
    setReason("");
    setDeductInvites("");
  };

  const submitAction = async () => {
    if (!actionType || !payment) return;
    const id = payment._id || payment.id;
    try {
      if (actionType === "refund") {
        const numeric = amount ? Number(amount) : undefined;
        // Only thread deductInvites on a partial refund where the admin set it.
        const deduct = Number(deductInvites);
        const deductInvitesValue =
          isPartialRefund && deductInvites !== "" && Number.isFinite(deduct) && deduct > 0
            ? deduct
            : undefined;
        await refund.mutateAsync({
          id,
          amount: Number.isFinite(numeric) ? numeric : undefined,
          reason: reason || undefined,
          deductInvites: deductInvitesValue,
          idempotencyKey,
        });
        toast.success(t("paymentDetail.refund.success"));
      } else if (actionType === "capture") {
        const numeric = amount ? Number(amount) : undefined;
        await capture.mutateAsync({
          id,
          amount: Number.isFinite(numeric) ? numeric : undefined,
          idempotencyKey,
        });
        toast.success(t("paymentDetail.capture.success"));
      } else if (actionType === "void") {
        await voidMutation.mutateAsync({ id, idempotencyKey });
        toast.success(t("paymentDetail.void.success"));
      }
      closeModal();
      refetch();
    } catch (err) {
      toast.error(err?.message || t("common.error"));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("paymentDetail.title")} showBack={true} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !payment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("paymentDetail.title")} showBack={true} />
        <View style={styles.center}>
          <Ionicons name="card-outline" size={48} color={colors.natural[400]} />
          <Text style={styles.notFound}>{t("paymentDetail.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currency = payment.currency || "SAR";
  const methodType = payment.paymentMethod?.type || payment.paymentMethod;
  const last4 = payment.paymentMethodLast4 || payment.paymentMethod?.last4;
  const methodLabel = methodType
    ? `${methodType}${last4 ? ` •••• ${last4}` : ""}`
    : null;

  const refunds = Array.isArray(payment.refunds) ? payment.refunds : [];
  const subscription = payment.subscription;
  const addon = payment.addon;
  const busy = refund.isPending || capture.isPending || voidMutation.isPending;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={t("paymentDetail.title")} showBack={true} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header card with status badge */}
        <View style={styles.heroCard}>
          <Text style={styles.heroAmount}>{formatAmount(payment.amount, currency)}</Text>
          {payment.refundedAmount > 0 ? (
            <Text style={styles.refundedTag}>
              {t("paymentDetail.refundedTag")} {formatAmount(payment.refundedAmount, currency)}
            </Text>
          ) : null}
          {status ? <StatusBadge status={status} size="medium" /> : null}
        </View>

        {/* Canonical fields */}
        <View style={styles.card}>
          <Row label={t("paymentDetail.id")} value={payment._id || payment.id} mono />
          <Row label={t("paymentDetail.status")} value={status} />
          <Row label={t("paymentDetail.method")} value={methodLabel} />
          <Row label={t("paymentDetail.moyasarId")} value={payment.moyasarPaymentId} mono />
          <Row label={t("paymentDetail.createdAt")} value={formatDateTime(payment.createdAt)} />
          {payment.capturedAt ? (
            <Row label={t("paymentDetail.capturedAt")} value={formatDateTime(payment.capturedAt)} />
          ) : null}
          {payment.voidedAt ? (
            <Row label={t("paymentDetail.voidedAt")} value={formatDateTime(payment.voidedAt)} />
          ) : null}
          {payment.refundedAt ? (
            <Row label={t("paymentDetail.refundedAt")} value={formatDateTime(payment.refundedAt)} />
          ) : null}
          {subscription ? (
            <Row
              label={t("paymentDetail.subscription")}
              value={String(
                (typeof subscription === "object"
                  ? subscription.planCode || subscription._id
                  : subscription) || "",
              )}
            />
          ) : null}
          {addon ? (
            <Row
              label={t("paymentDetail.addon")}
              value={String(
                (typeof addon === "object" ? addon.code || addon._id : addon) || "",
              )}
            />
          ) : null}
        </View>

        {/* Refunds list */}
        {refunds.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("paymentDetail.refunds")}</Text>
            {refunds.map((r, i) => (
              <View key={r._id || `${r.createdAt || ""}-${i}`} style={styles.refundRow}>
                <Text style={styles.refundAmount}>
                  {formatAmount(r.amount, currency)}
                  {r.reason ? ` — ${r.reason}` : ""}
                </Text>
                <Text style={styles.refundDate}>{formatDateTime(r.createdAt)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Admin write actions — gated by role + payment status */}
        {(showRefund || showCapture || showVoid) && (
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>{t("paymentDetail.actions.title")}</Text>
            {showRefund ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => setActionType("refund")}
                activeOpacity={0.8}
                disabled={busy}
              >
                <Ionicons name="return-up-back-outline" size={18} color={colors.error[500]} />
                <Text style={[styles.actionLabel, { color: colors.error[500] }]}>
                  {t("paymentDetail.actions.refund")}
                </Text>
              </TouchableOpacity>
            ) : null}
            {showCapture ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSuccess]}
                onPress={() => setActionType("capture")}
                activeOpacity={0.8}
                disabled={busy}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success[500]} />
                <Text style={[styles.actionLabel, { color: colors.success[500] }]}>
                  {t("paymentDetail.actions.capture")}
                </Text>
              </TouchableOpacity>
            ) : null}
            {showVoid ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => setActionType("void")}
                activeOpacity={0.8}
                disabled={busy}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.error[500]} />
                <Text style={[styles.actionLabel, { color: colors.error[500] }]}>
                  {t("paymentDetail.actions.void")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Refund / capture / void modal */}
      <Modal
        visible={!!actionType}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {actionType ? t(`paymentDetail.actions.${actionType}`) : ""}
            </Text>

            {actionType === "void" ? (
              <Text style={styles.fieldLabel}>
                {t("paymentDetail.voidConfirmMessage")}
              </Text>
            ) : null}

            {actionType === "refund" || actionType === "capture" ? (
              <>
                <Text style={styles.fieldLabel}>
                  {t("paymentDetail.amountLabel")} ({currency})
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={t("paymentDetail.amountPlaceholder")}
                  placeholderTextColor={colors.natural[400]}
                />
              </>
            ) : null}

            {actionType === "refund" ? (
              <>
                <Text style={styles.fieldLabel}>{t("paymentDetail.reasonLabel")}</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  multiline
                  value={reason}
                  onChangeText={setReason}
                  placeholder={t("paymentDetail.reasonPlaceholder")}
                  placeholderTextColor={colors.natural[400]}
                />
              </>
            ) : null}

            {isPartialRefund ? (
              <>
                <Text style={styles.fieldLabel}>
                  {t("paymentDetail.deductInvitesLabel")}
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={deductInvites}
                  onChangeText={setDeductInvites}
                  placeholder={t("paymentDetail.deductInvitesPlaceholder")}
                  placeholderTextColor={colors.natural[400]}
                />
                <Text style={styles.fieldHint}>
                  {t("paymentDetail.deductInvitesHint")}
                </Text>
              </>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={closeModal} disabled={busy}>
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={submitAction}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.natural[50]} />
                ) : (
                  <Text style={styles.modalConfirmText}>{t("common.confirm")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  scroll: { padding: spacing[16], gap: spacing[12] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing[24] },
  notFound: { ...textStyles.bodyMedium, color: colors.natural[500], marginTop: spacing[12] },

  heroCard: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    alignItems: "center",
    gap: spacing[8],
    borderWidth: 1,
    borderColor: colors.natural[200],
  },
  heroAmount: {
    fontSize: typography.fontSize.headline.medium,
    fontWeight: typography.fontWeight.bold,
    color: colors.natural[900],
  },
  refundedTag: {
    ...textStyles.bodySmall,
    color: colors.warning[500],
  },

  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
  },
  sectionTitle: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
    marginBottom: spacing[8],
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
    gap: spacing[12],
  },
  rowLabel: { ...textStyles.bodySmall, color: colors.natural[450], flexShrink: 0 },
  rowValue: { ...textStyles.bodySmall, color: colors.natural[900], flexShrink: 1, writingDirection: "ltr" },
  mono: { fontFamily: "Cairo_400Regular" },

  refundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing[8],
    gap: spacing[12],
  },
  refundAmount: { ...textStyles.bodySmall, color: colors.natural[900], flex: 1 },
  refundDate: { ...textStyles.bodySmall, color: colors.natural[450] },

  actionsCard: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    gap: spacing[8],
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    paddingVertical: spacing[12],
    borderRadius: borderRadius[8],
    borderWidth: 1,
  },
  actionBtnDanger: { borderColor: colors.error[500], backgroundColor: `${colors.error[500]}10` },
  actionBtnSuccess: { borderColor: colors.success[500], backgroundColor: `${colors.success[500]}10` },
  actionLabel: { ...textStyles.bodyMedium, fontWeight: typography.fontWeight.semibold },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: spacing[24],
  },
  modalCard: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    gap: spacing[8],
  },
  modalTitle: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.natural[900],
  },
  fieldLabel: { ...textStyles.bodySmall, color: colors.natural[600], marginTop: spacing[8] },
  fieldHint: { ...textStyles.caption, color: colors.natural[400], marginTop: spacing[4] },
  input: {
    borderWidth: 1,
    borderColor: colors.natural[200],
    borderRadius: borderRadius[8],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    color: colors.natural[900],
    fontSize: typography.fontSize.body.medium,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  modalButtons: { flexDirection: "row", gap: spacing[12], marginTop: spacing[12] },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing[12],
    borderRadius: borderRadius[8],
    alignItems: "center",
  },
  modalCancel: { backgroundColor: backgrounds.card[2], borderWidth: 1, borderColor: colors.natural[200] },
  modalCancelText: { ...textStyles.bodyMedium, color: colors.natural[700] },
  modalConfirm: { backgroundColor: colors.primary[500] },
  modalConfirmText: {
    ...textStyles.bodyMedium,
    color: colors.natural[50],
    fontWeight: typography.fontWeight.semibold,
  },
});

export default PaymentDetailScreen;

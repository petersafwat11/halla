/**
 * PurchaseQueueModal — Renders the durable native purchase queue (PR5 / F-08).
 *
 * Rules:
 *   - Shows only the exact next selected item, position X of N, and store price.
 *   - Never shows the general catalog.
 *   - Network loss after store success remains reconciling with "Do not purchase again" copy.
 *   - Never adds VAT to store prices; displays priceString verbatim.
 */

import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LocalizedText from "../commen/LocalizedText";
import AdaptiveText from "../commen/AdaptiveText";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { ITEM_STATUS, QUEUE_STATUS } from "@halaa/shared/schemas/purchaseQueue";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

const PurchaseQueueModal = ({
  queue,
  isBusy,
  onPurchaseItem,
  onRetryReconcile,
  onSupport,
  onCancel,
  onComplete,
  t,
  lang = "ar",
}) => {
  if (!queue) return null;

  const isCompleted = queue.status === QUEUE_STATUS.COMPLETED;
  const isCancelled = queue.status === QUEUE_STATUS.CANCELLED;
  const isFailed = queue.status === QUEUE_STATUS.FAILED;
  const isManualReview = queue.status === QUEUE_STATUS.MANUAL_REVIEW;

  const currentIndex = queue.currentIndex;
  const currentItem = queue.items[currentIndex] || queue.items[queue.items.length - 1];
  const totalItems = queue.items.length;

  const itemName =
    lang === "ar"
      ? currentItem?.nameAr || currentItem?.nameEn || currentItem?.catalogCode
      : currentItem?.nameEn || currentItem?.nameAr || currentItem?.catalogCode;

  const itemStatus = currentItem?.status;
  const isReconciling = itemStatus === ITEM_STATUS.RECONCILING;
  const isPurchasing = itemStatus === ITEM_STATUS.PURCHASING;
  const isFulfilled = itemStatus === ITEM_STATUS.FULFILLED;
  const isScheduled = itemStatus === ITEM_STATUS.SCHEDULED;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={undefined}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header with Position X of N */}
          <View style={styles.header}>
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>
                {t("queue.position", {
                  defaultValue: "Item {{current}} of {{total}}",
                  current: Math.min(currentIndex + 1, totalItems),
                  total: totalItems,
                })}
              </Text>
            </View>
            <LocalizedText style={styles.headerTitle}>
              {isCompleted
                ? t("queue.completedTitle", "All Items Completed")
                : t("queue.title", "Purchase Queue")}
            </LocalizedText>
          </View>

          {/* Item Content */}
          <View style={styles.itemBox}>
            <View style={styles.itemHeader}>
              <AdaptiveText style={styles.itemName} numberOfLines={2}>
                {itemName}
              </AdaptiveText>
              {currentItem?.priceString && (
                <Text style={styles.itemPrice}>
                  {isolateLtr(currentItem.priceString)}
                </Text>
              )}
            </View>

            {/* Status Messages */}
            {isPurchasing && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
                <LocalizedText style={styles.statusText}>
                  {t("iapFlow.purchasing", "Connecting to Store...")}
                </LocalizedText>
              </View>
            )}

            {isReconciling && (
              <View style={styles.reconcileBox}>
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={colors.accent[500]} />
                  <LocalizedText style={styles.reconcilingTitle}>
                    {t("iapStates.pending.title", "Confirming with server...")}
                  </LocalizedText>
                </View>
                <LocalizedText style={styles.warningNotice}>
                  {t(
                    "queue.doNotRepurchase",
                    "Reconciling your purchase with the server. Do not purchase again."
                  )}
                </LocalizedText>
              </View>
            )}

            {isFulfilled && !isCompleted && (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success[600]} />
                <LocalizedText style={styles.successText}>
                  {t("queue.itemFulfilled", "Activated successfully!")}
                </LocalizedText>
              </View>
            )}

            {isScheduled && (
              <View style={styles.statusRow}>
                <Ionicons name="time" size={20} color={colors.accent[700]} />
                <LocalizedText style={styles.reconcilingTitle}>
                  {t("queue.scheduled", "Your plan change is scheduled for the next renewal.")}
                </LocalizedText>
              </View>
            )}

            {isCompleted && (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success[600]} />
                <LocalizedText style={styles.successText}>
                  {t("queue.completed", "All purchases completed successfully!")}
                </LocalizedText>
              </View>
            )}

            {isCancelled && (
              <View style={styles.statusRow}>
                <Ionicons name="close-circle" size={20} color={colors.natural[500]} />
                <LocalizedText style={styles.cancelledText}>
                  {t("queue.cancelled", "Purchase cancelled.")}
                </LocalizedText>
              </View>
            )}

            {isFailed && (
              <View style={styles.statusRow}>
                <Ionicons name="alert-circle" size={20} color={colors.error[500]} />
                <LocalizedText style={styles.errorText}>
                  {t("iapStates.failed.title", "Purchase failed. No entitlement was confirmed.")}
                </LocalizedText>
              </View>
            )}

            {isManualReview && (
              <View style={styles.reconcileBox}>
                <View style={styles.statusRow}>
                  <Ionicons name="help-circle" size={20} color={colors.accent[700]} />
                  <LocalizedText style={styles.reconcilingTitle}>
                    {t("queue.manualReviewTitle", "Purchase needs review")}
                  </LocalizedText>
                </View>
                <LocalizedText style={styles.warningNotice}>
                  {t(
                    "queue.manualReviewBody",
                    "Do not purchase again. Contact support so we can verify this store transaction safely."
                  )}
                </LocalizedText>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {itemStatus === ITEM_STATUS.PENDING && !isCompleted && (
              <TouchableOpacity
                style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                onPress={onPurchaseItem}
                disabled={isBusy}
                activeOpacity={0.85}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={colors.natural[50]} />
                ) : (
                  <LocalizedText style={styles.primaryButtonText}>
                    {t("queue.buyItem", {
                      defaultValue: "Purchase {{price}}",
                      price: currentItem?.priceString || "",
                    })}
                  </LocalizedText>
                )}
              </TouchableOpacity>
            )}

            {isReconciling && (
              <TouchableOpacity
                style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                onPress={onRetryReconcile}
                disabled={isBusy}
                activeOpacity={0.85}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={colors.natural[50]} />
                ) : (
                  <LocalizedText style={styles.primaryButtonText}>
                    {t("queue.recheck", "Check Status")}
                  </LocalizedText>
                )}
              </TouchableOpacity>
            )}

            {isCompleted && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onComplete}
                activeOpacity={0.85}
              >
                <LocalizedText style={styles.primaryButtonText}>
                  {t("queue.continue", "Continue")}
                </LocalizedText>
              </TouchableOpacity>
            )}

            {isManualReview && onSupport && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onSupport}
                activeOpacity={0.85}
              >
                <LocalizedText style={styles.primaryButtonText}>
                  {t("queue.contactSupport", "Contact support")}
                </LocalizedText>
              </TouchableOpacity>
            )}

            {(isCancelled || isFailed || isManualReview) && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onCancel}
                activeOpacity={0.85}
              >
                <LocalizedText style={styles.secondaryButtonText}>
                  {t("queue.close", "Close")}
                </LocalizedText>
              </TouchableOpacity>
            )}

            {!isCompleted && !isCancelled && !isFailed && !isManualReview && !isReconciling && !isPurchasing && totalItems > 1 && (
              <TouchableOpacity
                style={styles.cancelLink}
                onPress={onCancel}
                disabled={isBusy}
                activeOpacity={0.7}
              >
                <LocalizedText style={styles.cancelLinkText}>
                  {t("queue.cancelRemaining", "Cancel remaining")}
                </LocalizedText>
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[24],
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[20],
    padding: spacing[24],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing[16],
  },
  positionBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[12],
    marginBottom: spacing[8],
  },
  positionText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.caption,
    color: colors.primary[700],
  },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[800],
  },
  itemBox: {
    backgroundColor: colors.natural[100],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    marginBottom: spacing[20],
    borderWidth: 1,
    borderColor: colors.natural[200],
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[8],
    gap: spacing[12],
  },
  itemName: {
    flex: 1,
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[800],
  },
  itemPrice: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.large,
    color: colors.primary[600],
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    marginTop: spacing[8],
  },
  statusText: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[600],
  },
  reconcileBox: {
    marginTop: spacing[8],
    padding: spacing[12],
    backgroundColor: colors.accent[50] || "#FFF8E1",
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.accent[200] || "#FFE082",
  },
  reconcilingTitle: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[800],
  },
  warningNotice: {
    marginTop: spacing[4],
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.caption,
    color: colors.error[600] || "#D32F2F",
    lineHeight: 18,
  },
  successText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.success[700],
  },
  cancelledText: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[600],
  },
  errorText: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.error[600],
  },
  actions: {
    gap: spacing[12],
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[14],
    borderRadius: borderRadius[12],
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[50],
  },
  secondaryButton: {
    backgroundColor: colors.natural[200],
    paddingVertical: spacing[12],
    borderRadius: borderRadius[12],
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[700],
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: spacing[6],
  },
  cancelLinkText: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[600],
    textDecorationLine: "underline",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default PurchaseQueueModal;

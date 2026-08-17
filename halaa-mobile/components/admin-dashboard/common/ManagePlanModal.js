import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { Button } from "../../commen";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";
import {
  useAssignablePlans,
  useUpdateHostSubscription,
  useGrantHostExtraInvites,
  useAssignBusinessPlan,
  useGrantBusinessExtraInvites,
} from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { getLocalized } from "@halaa/shared/utils/locale";

const INVITE_PRESETS = [10, 25, 50, 100, 250, 500];

const getCurrentPlanCode = (subscription) =>
  subscription?.planId?.code ||
  subscription?.planCode ||
  subscription?.code ||
  "";

const getRemainingInvites = (subscription, unlimitedLabel) => {
  if (!subscription) return "—";
  if (subscription.invitePool === null || subscription.invitePool === undefined) {
    return unlimitedLabel;
  }
  if (
    subscription.invitesRemaining !== undefined &&
    subscription.invitesRemaining !== null
  ) {
    return String(subscription.invitesRemaining);
  }
  return String(
    (subscription.invitePool || 0) +
      (subscription.compensationPool || 0) -
      (subscription.invitesConsumed || 0)
  );
};

/**
 * Shared admin "Manage Plan" modal — the mobile equivalent of web's
 * ManagePlanPopup. Two modes:
 *   - Change plan: host → PATCH /admin/hosts/:id/subscription;
 *     business → POST /admin/businesses/:id/assign-plan (grant | checkout).
 *   - Extra invites: POST .../subscription/extra-invites { quantity, reason }.
 *
 * Plan changes create a fresh subscription server-side (cancelling the old one
 * while existing events keep their attached subscription), so admin behaviour
 * matches self-service exactly.
 */
const ManagePlanModal = ({ visible, onClose, entity, entityType = "host", onSave }) => {
  const isBusiness = entityType === "business";
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language;
  const toast = useToast();
  const mp = (key, fallback) => t(`managePlan.${key}`, fallback);

  const id = entity?.id || entity?._id;
  const subscription = entity?.subscription || null;

  const [tab, setTab] = useState("change");
  const [planCode, setPlanCode] = useState("");
  const [businessMode, setBusinessMode] = useState("grant");
  const [reason, setReason] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [quantity, setQuantity] = useState("25");
  const [addAfterChange, setAddAfterChange] = useState(false);
  const [checkoutLink, setCheckoutLink] = useState(null);

  const {
    data: plansData,
    isLoading: plansLoading,
    error: plansError,
    refetch: refetchPlans,
  } = useAssignablePlans({ availableFor: isBusiness ? "business" : "host" });

  const updateHost = useUpdateHostSubscription();
  const grantHostExtra = useGrantHostExtraInvites();
  const assignBusiness = useAssignBusinessPlan();
  const grantBusinessExtra = useGrantBusinessExtraInvites();

  const plans = useMemo(() => plansData?.data?.plans || [], [plansData]);
  const selectedPlan = plans.find((plan) => plan.code === planCode);
  const isCheckout = isBusiness && businessMode === "checkout";

  const changing = isBusiness ? assignBusiness.isPending : updateHost.isPending;
  const granting = isBusiness ? grantBusinessExtra.isPending : grantHostExtra.isPending;
  const isSubmitting = changing || granting;

  // Reset transient state every time the modal opens for a (new) entity.
  useEffect(() => {
    if (visible) {
      setPlanCode(getCurrentPlanCode(entity?.subscription));
      setTab("change");
      setBusinessMode("grant");
      setReason("");
      setDiscountCode("");
      setQuantity("25");
      setAddAfterChange(false);
      setCheckoutLink(null);
    }
  }, [visible, entity]);

  const formatPlanMeta = (plan) => {
    const price = plan?.price ?? plan?.pricing?.oneTime ?? 0;
    const currency = plan?.currency || "SAR";
    const totalInvites =
      plan?.invitePool === null || plan?.invitePool === undefined
        ? mp("unlimited", "Unlimited")
        : (plan.invitePool || 0) + (plan.compensationPool || 0);
    return `${price} ${currency} · ${totalInvites} ${mp("invites", "invites")}`;
  };

  const grantExtraInvites = async () => {
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 500) {
      toast.warning(mp("invalidQuantity", "Enter 1 to 500 invites."));
      return false;
    }
    if (isBusiness) {
      await grantBusinessExtra.mutateAsync({
        businessId: id,
        quantity: parsedQuantity,
        reason: reason || undefined,
      });
    } else {
      await grantHostExtra.mutateAsync({
        hostId: id,
        quantity: parsedQuantity,
        reason: reason || undefined,
      });
    }
    return true;
  };

  const submitExtra = async () => {
    try {
      const ok = await grantExtraInvites();
      if (!ok) return;
      toast.success(mp("extraSuccess", "Extra invites added."));
      onSave?.();
      onClose();
    } catch (error) {
      toast.error(error.message || mp("planLoadError", "Something went wrong."));
    }
  };

  const submitPlanChange = async () => {
    if (!planCode) {
      toast.warning(mp("selectPlan", "Select a plan."));
      return;
    }
    try {
      if (isBusiness) {
        const result = await assignBusiness.mutateAsync({
          businessId: id,
          mode: businessMode,
          planCode,
          discountCode: isCheckout ? discountCode || undefined : undefined,
          grantReason: !isCheckout ? reason || undefined : undefined,
        });
        if (isCheckout) {
          const link = result?.data?.link;
          setCheckoutLink(link || null);
          toast.success(mp("checkoutReady", "Checkout link created."));
          onSave?.();
          return;
        }
      } else {
        await updateHost.mutateAsync({
          hostId: id,
          planCode,
          reason: reason || undefined,
        });
      }

      if (addAfterChange && !isCheckout) {
        const ok = await grantExtraInvites();
        if (!ok) return;
      }

      toast.success(mp("changeSuccess", "Plan updated."));
      onSave?.();
      onClose();
    } catch (error) {
      toast.error(error.message || mp("planLoadError", "Something went wrong."));
    }
  };

  const handleSubmit = () => {
    if (tab === "extra") submitExtra();
    else submitPlanChange();
  };

  const shareCheckoutLink = async () => {
    if (!checkoutLink) return;
    try {
      await Share.share({ message: checkoutLink });
    } catch (_) {
      // user dismissed the share sheet — no-op
    }
  };

  if (!visible || !entity) return null;

  const entityName = entity?.name || entity?.username || entity?.email || "—";
  const showExtraSection =
    tab === "extra" || (tab === "change" && addAfterChange && !isCheckout);

  const summaryRows = [
    {
      label: mp("currentPlan", "Current plan"),
      value:
        getLocalized(subscription?.planId || {}, "name", locale) ||
        subscription?.planId?.code ||
        subscription?.planType ||
        "—",
    },
    {
      label: mp("status", "Status"),
      value: subscription?.status || mp("none", "None"),
    },
    {
      label: mp("remaining", "Remaining invites"),
      value: getRemainingInvites(subscription, mp("unlimited", "Unlimited")),
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>
                {isBusiness ? mp("business", "Business") : mp("host", "Host")}
              </Text>
              <Text style={styles.title}>{mp("title", "Manage Plan")}</Text>
              <Text style={styles.entityName} numberOfLines={1}>
                {entityName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.natural[900]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.summaryGrid}>
              {summaryRows.map((row) => (
                <View style={styles.summaryItem} key={row.label}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, tab === "change" && styles.tabActive]}
                onPress={() => setTab("change")}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={16}
                  color={tab === "change" ? colors.primary[600] : colors.natural[600]}
                />
                <Text style={[styles.tabText, tab === "change" && styles.tabTextActive]}>
                  {mp("changePlan", "Change plan")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === "extra" && styles.tabActive]}
                onPress={() => setTab("extra")}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={tab === "extra" ? colors.primary[600] : colors.natural[600]}
                />
                <Text style={[styles.tabText, tab === "extra" && styles.tabTextActive]}>
                  {mp("extraInvites", "Extra invites")}
                </Text>
              </TouchableOpacity>
            </View>

            {checkoutLink ? (
              <View style={styles.checkoutBox}>
                <Text style={styles.label}>{mp("checkoutLink", "Checkout link")}</Text>
                <Text style={styles.checkoutLinkText} selectable numberOfLines={3}>
                  {checkoutLink}
                </Text>
                <TouchableOpacity style={styles.copyBtn} onPress={shareCheckoutLink}>
                  <Ionicons name="share-outline" size={16} color={colors.primary[600]} />
                  <Text style={styles.copyBtnText}>{mp("copy", "Copy")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {tab === "change" && (
                  <View style={styles.section}>
                    {isBusiness && (
                      <View style={styles.segmented}>
                        <TouchableOpacity
                          style={[
                            styles.segment,
                            businessMode === "grant" && styles.segmentActive,
                          ]}
                          onPress={() => setBusinessMode("grant")}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              businessMode === "grant" && styles.segmentTextActive,
                            ]}
                          >
                            {mp("grant", "Grant")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.segment,
                            businessMode === "checkout" && styles.segmentActive,
                          ]}
                          onPress={() => setBusinessMode("checkout")}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              businessMode === "checkout" && styles.segmentTextActive,
                            ]}
                          >
                            {mp("checkout", "Checkout")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={styles.label}>{mp("plan", "Plan")}</Text>
                    {plansLoading ? (
                      <View style={styles.inlineState}>
                        <ActivityIndicator size="small" color={colors.primary[500]} />
                        <Text style={styles.inlineStateText}>
                          {mp("loadingPlans", "Loading plans...")}
                        </Text>
                      </View>
                    ) : plansError ? (
                      <View style={styles.inlineError}>
                        <Text style={styles.errorText}>
                          {mp("planLoadError", "Could not load plans.")}
                        </Text>
                        <TouchableOpacity onPress={() => refetchPlans()} style={styles.retryBtn}>
                          <Text style={styles.retryBtnText}>{mp("retry", "Retry")}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.planList}>
                        {plans.map((plan) => {
                          const active = plan.code === planCode;
                          return (
                            <TouchableOpacity
                              key={plan.code}
                              style={[styles.planOption, active && styles.planOptionActive]}
                              onPress={() => setPlanCode(plan.code)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.planName,
                                    active && styles.planNameActive,
                                  ]}
                                >
                                  {getLocalized(plan, "name", locale) || plan.code}
                                </Text>
                                <Text style={styles.planMeta}>{formatPlanMeta(plan)}</Text>
                              </View>
                              {active && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={20}
                                  color={colors.primary[500]}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {isCheckout ? (
                      <View style={styles.field}>
                        <Text style={styles.label}>{mp("discountCode", "Discount code")}</Text>
                        <TextInput
                          style={styles.input}
                          value={discountCode}
                          onChangeText={setDiscountCode}
                          placeholder={mp("discountPlaceholder", "Optional")}
                          placeholderTextColor={colors.natural[400]}
                          autoCapitalize="characters"
                        />
                      </View>
                    ) : (
                      <View style={styles.field}>
                        <Text style={styles.label}>{mp("reason", "Reason")}</Text>
                        <TextInput
                          style={styles.input}
                          value={reason}
                          onChangeText={setReason}
                          placeholder={mp("reasonPlaceholder", "Optional")}
                          placeholderTextColor={colors.natural[400]}
                        />
                      </View>
                    )}

                    {!isCheckout && (
                      <TouchableOpacity
                        style={styles.checkRow}
                        onPress={() => setAddAfterChange((prev) => !prev)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={addAfterChange ? "checkbox" : "square-outline"}
                          size={20}
                          color={addAfterChange ? colors.primary[500] : colors.natural[400]}
                        />
                        <Text style={styles.checkRowText}>
                          {mp("addExtraAfterChange", "Add extra invites after update")}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {showExtraSection && (
                  <View style={styles.section}>
                    <Text style={styles.label}>{mp("quantity", "Quantity")}</Text>
                    <View style={styles.presetRow}>
                      {INVITE_PRESETS.map((preset) => {
                        const active = Number(quantity) === preset;
                        return (
                          <TouchableOpacity
                            key={preset}
                            style={[styles.preset, active && styles.presetActive]}
                            onPress={() => setQuantity(String(preset))}
                          >
                            <Text
                              style={[styles.presetText, active && styles.presetTextActive]}
                            >
                              {preset}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TextInput
                      style={styles.input}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    {tab === "extra" && (
                      <View style={styles.field}>
                        <Text style={styles.label}>{mp("reason", "Reason")}</Text>
                        <TextInput
                          style={styles.input}
                          value={reason}
                          onChangeText={setReason}
                          placeholder={mp("reasonPlaceholder", "Optional")}
                          placeholderTextColor={colors.natural[400]}
                        />
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.buttonWrapper}>
              <Button
                text={checkoutLink ? mp("done", "Done") : t("common.cancel")}
                onPress={onClose}
                variant="outline"
                size="small"
                disabled={isSubmitting}
              />
            </View>
            {!checkoutLink && (
              <View style={styles.buttonWrapper}>
                <Button
                  text={
                    isSubmitting
                      ? mp("saving", "Saving...")
                      : tab === "extra"
                        ? mp("addInvites", "Add invites")
                        : mp("updatePlan", "Update plan")
                  }
                  onPress={handleSubmit}
                  variant="primary"
                  size="small"
                  loading={isSubmitting}
                  disabled={
                    isSubmitting || (tab === "change" && (plansLoading || !!plansError))
                  }
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

ManagePlanModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  entity: PropTypes.object,
  entityType: PropTypes.oneOf(["host", "business"]),
  onSave: PropTypes.func,
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: backgrounds.card[1],
    borderTopLeftRadius: borderRadius[20],
    borderTopRightRadius: borderRadius[20],
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing[20],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  kicker: {
    fontSize: typography.fontSize.body.small,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
  },
  title: {
    ...textStyles.titleLarge,
    color: colors.natural[900],
  },
  entityName: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
    marginTop: 2,
  },
  closeButton: {
    padding: spacing[4],
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    padding: spacing[20],
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
    marginBottom: spacing[16],
  },
  summaryItem: {
    flexGrow: 1,
    flexBasis: "30%",
    padding: spacing[12],
    backgroundColor: backgrounds.card[3],
    borderRadius: borderRadius[12],
  },
  summaryLabel: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  tabs: {
    flexDirection: "row",
    gap: spacing[8],
    marginBottom: spacing[16],
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    paddingVertical: spacing[12],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[250],
    backgroundColor: backgrounds.card[2],
  },
  tabActive: {
    borderColor: colors.primary[500],
    backgroundColor: `${colors.primary[500]}10`,
  },
  tabText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[600],
  },
  tabTextActive: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
  },
  section: {
    gap: spacing[12],
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: backgrounds.card[2],
    borderRadius: borderRadius[8],
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing[8],
    alignItems: "center",
    borderRadius: borderRadius[8] - 2,
  },
  segmentActive: {
    backgroundColor: colors.primary[500],
  },
  segmentText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[700],
  },
  segmentTextActive: {
    color: "#fff",
    fontWeight: typography.fontWeight.semibold,
  },
  field: {
    gap: spacing[8],
  },
  label: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[900],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.natural[250],
    borderRadius: borderRadius[8],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    backgroundColor: backgrounds.card[2],
  },
  planList: {
    gap: spacing[8],
  },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
    backgroundColor: backgrounds.card[2],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[250],
    gap: spacing[8],
  },
  planOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: `${colors.primary[500]}10`,
  },
  planName: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[800],
  },
  planNameActive: {
    color: colors.primary[600],
  },
  planMeta: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    marginTop: 2,
  },
  inlineState: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[12],
  },
  inlineStateText: {
    color: colors.natural[600],
    fontSize: typography.fontSize.body.medium,
  },
  inlineError: {
    paddingVertical: spacing[12],
    gap: spacing[8],
  },
  errorText: {
    color: colors.error[500],
    fontSize: typography.fontSize.body.medium,
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius[8],
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.body.medium,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[4],
  },
  checkRowText: {
    flex: 1,
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[700],
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  preset: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    backgroundColor: backgrounds.card[2],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.natural[250],
  },
  presetActive: {
    borderColor: colors.primary[500],
    backgroundColor: `${colors.primary[500]}10`,
  },
  presetText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[700],
  },
  presetTextActive: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
  },
  checkoutBox: {
    gap: spacing[8],
    padding: spacing[12],
    backgroundColor: backgrounds.card[3],
    borderRadius: borderRadius[12],
  },
  checkoutLinkText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[800],
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  copyBtnText: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.body.medium,
  },
  footer: {
    flexDirection: "row",
    padding: spacing[20],
    gap: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
    backgroundColor: backgrounds.card[1],
  },
  buttonWrapper: {
    flex: 1,
  },
});

export default ManagePlanModal;

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
  useAdminPlans,
  useUpdateHostSubscription,
  useUpdateWhitelabelSubscription,
} from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { getLocalized } from "../../../utils/locale";

/**
 * Shared "Manage Subscription" modal for the admin dashboard. Mirrors the
 * web `SubscriptionAssignmentPopup` — the same UI, payload, and `{ planCode,
 * status }` schema for both host and whitelabel users — and dispatches to
 * the entity-type-specific endpoint:
 *
 *   - host       → PATCH /admin/hosts/:id/subscription
 *   - whitelabel → PATCH /admin/whitelabels/:id/subscription
 */
const PickDropdown = ({ label, options, selectedValue, onSelect }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.pickerContainer}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.pickerOption,
            selectedValue === opt.value && styles.pickerOptionSelected,
          ]}
          onPress={() => onSelect(opt.value)}
        >
          <Text
            style={[
              styles.pickerOptionText,
              selectedValue === opt.value && styles.pickerOptionTextSelected,
            ]}
          >
            {opt.label}
          </Text>
          {selectedValue === opt.value && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const SubscriptionAssignmentModal = ({
  visible,
  onClose,
  entity,
  entityType,
  onSave,
}) => {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language;
  const toast = useToast();

  const nsPrefix = entityType === "host" ? "hosts" : "whitelabels";
  const tk = (key) => t(`${nsPrefix}.subscription.${key}`);

  const hostMutation = useUpdateHostSubscription();
  const whitelabelMutation = useUpdateWhitelabelSubscription();
  const updateSubscription =
    entityType === "host" ? hostMutation : whitelabelMutation;

  const {
    data: plansData,
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans,
  } = useAdminPlans({ availableFor: entityType });

  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("active");

  useEffect(() => {
    if (visible && entity) {
      setSelectedPlan(
        entity.subscription?.planId?.code ||
          entity.subscription?.planType ||
          ""
      );
      setSelectedStatus(entity.subscription?.status || "active");
    }
  }, [visible, entity]);

  const planOptions = useMemo(() => {
    const list = plansData?.data?.plans || [];
    return list.map((p) => ({
      label: getLocalized(p, "name", locale),
      value: p.code,
      planType: p.planType,
    }));
  }, [plansData, locale]);

  const statusOptions = useMemo(
    () => [
      { label: tk("statusActive"), value: "active" },
      { label: tk("statusExpired"), value: "expired" },
      { label: tk("statusCancelled"), value: "cancelled" },
    ],
    [t, entityType] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleSave = async () => {
    if (!selectedPlan || !selectedStatus) {
      toast.warning(tk("validation"));
      return;
    }

    const entityId = entity._id || entity.id;
    const payload =
      entityType === "host"
        ? { hostId: entityId, planCode: selectedPlan, status: selectedStatus }
        : { whitelabelId: entityId, planCode: selectedPlan, status: selectedStatus };

    try {
      await updateSubscription.mutateAsync(payload);
      toast.success(tk("updated"));
      onSave?.({ planCode: selectedPlan, status: selectedStatus });
      onClose();
    } catch (error) {
      toast.error(error.message || tk("updateFailed"));
    }
  };

  if (!visible || !entity) return null;

  const entityName =
    entity.name ||
    entity.username ||
    (entityType === "host"
      ? t("hosts.labels.unnamed")
      : t("whitelabels.labels.unnamed"));
  const entitySubLabel =
    entityType === "host"
      ? entity.email || entity.phoneNumber
      : entity.domain || entity.email;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{tk("manageTitle")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.natural[900]} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.entityInfo}>
              <Text style={styles.entityName}>{entityName}</Text>
              {entitySubLabel ? (
                <Text style={styles.entitySubLabel}>{entitySubLabel}</Text>
              ) : null}
            </View>

            {isLoadingPlans ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.loadingText}>{tk("loadingPlans")}</Text>
              </View>
            ) : plansError ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={36}
                  color={colors.error[500]}
                />
                <Text style={styles.errorText}>{tk("errorLoadingPlans")}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => refetchPlans()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryButtonText}>{tk("retry")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <PickDropdown
                label={tk("selectPlan")}
                options={planOptions}
                selectedValue={selectedPlan}
                onSelect={setSelectedPlan}
              />
            )}

            <PickDropdown
              label={tk("selectStatus")}
              options={statusOptions}
              selectedValue={selectedStatus}
              onSelect={setSelectedStatus}
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.buttonWrapper}>
              <Button
                text={t("common.cancel")}
                onPress={onClose}
                variant="outline"
                size="small"
                disabled={updateSubscription.isPending}
              />
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                text={
                  updateSubscription.isPending
                    ? tk("updating")
                    : tk("update")
                }
                onPress={handleSave}
                variant="primary"
                size="small"
                loading={updateSubscription.isPending}
                disabled={isLoadingPlans || !!plansError}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

SubscriptionAssignmentModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  entity: PropTypes.object,
  entityType: PropTypes.oneOf(["host", "whitelabel"]).isRequired,
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
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[20],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  title: {
    ...textStyles.titleLarge,
    color: colors.natural[900],
  },
  closeButton: {
    padding: spacing[4],
  },
  content: {
    padding: spacing[20],
  },
  entityInfo: {
    marginBottom: spacing[16],
    padding: spacing[12],
    backgroundColor: backgrounds.card[3],
    borderRadius: borderRadius[12],
  },
  entityName: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    marginBottom: 4,
  },
  entitySubLabel: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
  },
  loadingContainer: {
    padding: spacing[24],
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing[12],
    color: colors.natural[600],
    fontSize: typography.fontSize.body.medium,
  },
  errorContainer: {
    padding: spacing[24],
    alignItems: "center",
    gap: spacing[8],
  },
  errorText: {
    color: colors.natural[700],
    fontSize: typography.fontSize.body.medium,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[20],
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius[8],
  },
  retryButtonText: {
    color: "#fff",
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
  },
  field: {
    marginBottom: spacing[20],
  },
  label: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[900],
    marginBottom: spacing[8],
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: backgrounds.card[2],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.natural[250],
    gap: spacing[8],
  },
  pickerOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: `${colors.primary[500]}10`,
  },
  pickerOptionText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[700],
  },
  pickerOptionTextSelected: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
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

export default SubscriptionAssignmentModal;

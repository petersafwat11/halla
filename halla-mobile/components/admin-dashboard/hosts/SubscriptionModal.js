import React, { useState, useEffect } from "react";
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
import { Button } from "../../../components/commen";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";
import { useHostPlans, useUpdateHostSubscription } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";

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

const SubscriptionModal = ({ visible, onClose, host }) => {
  const { t } = useTranslation("admin");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const updateSubscription = useUpdateHostSubscription();
  const { data: plansData, isLoading: isLoadingPlans } = useHostPlans();
  const toast = useToast();

  const statusOptions = [
    { label: t("hosts.status.active"),                  value: "active" },
    { label: t("hosts.subscription.statusExpired"),     value: "expired" },
    { label: t("hosts.subscription.statusCancelled"),   value: "cancelled" },
  ];

  const dynamicPlanOptions = React.useMemo(() => {
    if (!plansData?.data) return [];

    const basicEvent = (plansData.data?.basic?.event || []);
    const basicMonthly = (plansData.data?.basic?.monthly || []);
    const premiumEvent = (plansData.data?.premium?.event || []);
    const premiumMonthly = (plansData.data?.premium?.monthly || []);
    const allPlans = [...basicEvent, ...basicMonthly, ...premiumEvent, ...premiumMonthly];

    return allPlans.map((p) => ({
      label: p.nameEn || p.code,
      value: p.code,
    }));
  }, [plansData, t]);

  useEffect(() => {
    if (visible && host) {
      setSelectedPlan(
        host.subscription?.planId?.code ||
        host.subscription?.planCode ||
        host.subscription?.planType ||
        "",
      );
      setSelectedStatus(host.subscription?.status || "active");
    }
  }, [visible, host]);

  const handleSave = async () => {
    if (!selectedPlan || !selectedStatus) {
      toast.warning(t("hosts.subscription.validation"));
      return;
    }

    try {
      await updateSubscription.mutateAsync({
        hostId: host.id || host._id,
        subscriptionData: {
          planCode: selectedPlan,
          status: selectedStatus,
        },
      });
      toast.success(t("hosts.subscription.updated"));
      onClose();
    } catch (error) {
      toast.error(error.message || t("hosts.subscription.updateFailed"));
    }
  };

  if (!visible || !host) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("hosts.subscription.updateTitle")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.natural[900]} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>
                {host.name || host.username || t("hosts.labels.unnamed")}
              </Text>
              <Text style={styles.hostEmail}>{host.email || host.phoneNumber || ""}</Text>
            </View>

            {isLoadingPlans ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.loadingText}>{t("hosts.subscription.loadingPlans")}</Text>
              </View>
            ) : (
              <PickDropdown
                label={t("hosts.subscription.selectPlan")}
                options={dynamicPlanOptions}
                selectedValue={selectedPlan}
                onSelect={setSelectedPlan}
              />
            )}

            <PickDropdown
              label={t("hosts.subscription.selectStatus")}
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
                    ? t("hosts.subscription.updating")
                    : t("hosts.subscription.update")
                }
                onPress={handleSave}
                variant="primary"
                size="small"
                loading={updateSubscription.isPending}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

SubscriptionModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  host: PropTypes.object,
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
  hostInfo: {
    marginBottom: spacing[16],
    padding: spacing[12],
    backgroundColor: backgrounds.card[3],
    borderRadius: borderRadius[12],
  },
  hostName: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    marginBottom: 4,
  },
  hostEmail: {
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

export default SubscriptionModal;

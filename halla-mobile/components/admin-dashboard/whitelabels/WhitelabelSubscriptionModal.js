import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";
import { useUpdateWhitelabelSubscription, useAdminEnterprisePlans } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";

const WhitelabelSubscriptionModal = ({ visible, onClose, whitelabel, onSave }) => {
  const { t, currentLanguage } = useTranslation("admin");
  const isArabic = currentLanguage === "ar";
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const updateSubscription = useUpdateWhitelabelSubscription();
  const { data: plansData, isLoading: isLoadingPlans } = useAdminEnterprisePlans();
  const toast = useToast();

  const statusOptions = [
    { value: "active",    label: t("whitelabels.subscription.statusActive"),    color: colors.success[500], bg: `${colors.success[500]}18` },
    { value: "expired",   label: t("whitelabels.subscription.statusExpired"),   color: colors.error[500],   bg: `${colors.error[500]}18` },
    { value: "cancelled", label: t("whitelabels.subscription.statusCancelled"), color: colors.natural[400], bg: colors.natural[150] },
  ];

  const planSections = useMemo(() => {
    const d = plansData?.data || plansData;
    return [
      { key: "event",     labelEn: "Per-Event Plans",   labelAr: "باقات لكل مناسبة",   plans: d?.event     || [] },
      { key: "quarterly", labelEn: "3-Month Pool",       labelAr: "رصيد ٣ أشهر",         plans: d?.quarterly || [] },
      { key: "annual",    labelEn: "Annual Pool",         labelAr: "رصيد سنوي",            plans: d?.annual    || [] },
    ].filter((s) => s.plans.length > 0);
  }, [plansData]);

  useEffect(() => {
    if (visible && whitelabel) {
      const planCode =
        whitelabel.subscription?.planId?.code ||
        whitelabel.subscription?.planCode ||
        "";
      setSelectedPlan(planCode);
      setSelectedStatus(whitelabel.subscription?.status || "active");
    }
  }, [visible, whitelabel]);

  const handleSave = async () => {
    if (!selectedPlan) {
      toast.warning(t("whitelabels.subscription.noPlanSelected"));
      return;
    }
    try {
      await updateSubscription.mutateAsync({
        whitelabelId: whitelabel._id || whitelabel.id,
        subscriptionData: { planCode: selectedPlan, status: selectedStatus },
      });
      toast.success(t("whitelabels.subscription.updated"));
      if (onSave) onSave({ planCode: selectedPlan, status: selectedStatus });
      onClose();
    } catch (error) {
      toast.error(error?.message || t("whitelabels.subscription.updateFailed"));
    }
  };

  if (!visible || !whitelabel) return null;

  const isPending = updateSubscription.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("whitelabels.subscription.manageTitle")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isPending}>
              <Ionicons name="close" size={22} color={colors.natural[700]} />
            </TouchableOpacity>
          </View>

          <View style={styles.whitelabelInfo}>
            <Text style={styles.whitelabelName}>
              {whitelabel.name || whitelabel.username || t("whitelabels.labels.unnamed")}
            </Text>
            {whitelabel.domain ? (
              <Text style={styles.whitelabelDomain}>{whitelabel.domain}</Text>
            ) : null}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>{t("whitelabels.subscription.enterprisePlan")}</Text>

            {isLoadingPlans ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.loadingText}>{t("whitelabels.subscription.loadingPlans")}</Text>
              </View>
            ) : planSections.length === 0 ? (
              <Text style={styles.noPlansText}>{t("whitelabels.subscription.noPlansAvailable")}</Text>
            ) : (
              <View>
                {planSections.map((section) => (
                    <View key={section.key} style={{ marginBottom: spacing[16] }}>
                      <Text style={styles.sectionGroupLabel}>
                        {isArabic ? section.labelAr : section.labelEn}
                      </Text>
                      <View style={styles.plansContainer}>
                        {section.plans.map((plan) => {
                          const isSelected = selectedPlan === plan.code;
                          const planLabel = plan.nameEn || plan.code;
                          const planDesc  = plan.nameAr  || "";
                          const inviteInfo = plan.limits?.invitePool != null
                            ? `${plan.limits.invitePool} invites (pool)`
                            : plan.limits?.maxInvitesPerEvent != null
                            ? `${plan.limits.maxInvitesPerEvent} invites/event`
                            : "";
                          const price = plan.pricing?.oneTime || 0;
                          return (
                            <TouchableOpacity
                              key={plan.code}
                              style={[styles.planCard, isSelected && styles.planCardSelected]}
                              onPress={() => setSelectedPlan(plan.code)}
                              activeOpacity={0.75}
                            >
                              <View style={styles.planCardLeft}>
                                <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
                                  {isSelected && <View style={styles.planRadioDot} />}
                                </View>
                                <View style={styles.planTextBlock}>
                                  <Text style={[styles.planLabel, isSelected && styles.planLabelSelected]}>
                                    {planLabel}
                                  </Text>
                                  <Text style={styles.planDesc}>
                                    {price.toLocaleString()} SAR{inviteInfo ? `  ·  ${inviteInfo}` : ""}
                                  </Text>
                                  {planDesc ? <Text style={styles.planDescAr}>{planDesc}</Text> : null}
                                </View>
                              </View>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionLabel, { marginTop: spacing[20] }]}>
              {t("whitelabels.subscription.statusLabel")}
            </Text>
            <View style={styles.statusRow}>
              {statusOptions.map((opt) => {
                const isSelected = selectedStatus === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.statusChip,
                      isSelected && { backgroundColor: opt.bg, borderColor: opt.color },
                    ]}
                    onPress={() => setSelectedStatus(opt.value)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        isSelected && { color: opt.color, fontWeight: typography.fontWeight.semibold },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: spacing[24] }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isPending}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>{t("whitelabels.subscription.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isPending && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isPending || !selectedPlan}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{t("whitelabels.subscription.update")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: backgrounds.card[1],
    borderTopLeftRadius: borderRadius[20],
    borderTopRightRadius: borderRadius[20],
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  title: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
  },
  closeBtn: {
    padding: spacing[4],
  },
  whitelabelInfo: {
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    backgroundColor: colors.natural[150],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  whitelabelName: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  whitelabelDomain: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[20],
  },
  sectionLabel: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[700],
    marginBottom: spacing[12],
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  noPlansText: {
    color: colors.natural[400],
    fontSize: typography.fontSize.body.medium,
    paddingVertical: spacing[12],
  },
  plansContainer: {
    gap: spacing[8],
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[12],
    borderWidth: 1.5,
    borderColor: colors.natural[250],
    backgroundColor: backgrounds.card[1],
  },
  planCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: `${colors.primary[500]}08`,
  },
  planCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    flex: 1,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.natural[300],
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioSelected: {
    borderColor: colors.primary[500],
  },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  planTextBlock: {
    flex: 1,
  },
  planLabel: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[800],
  },
  planLabelSelected: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  planDesc: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[500],
    marginTop: 2,
  },
  planDescAr: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[400],
    marginTop: 1,
  },
  sectionGroupLabel: {
    fontSize: typography.fontSize.label.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[600],
    marginBottom: spacing[8],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  statusRow: {
    flexDirection: "row",
    gap: spacing[8],
  },
  statusChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: borderRadius[8],
    borderWidth: 1.5,
    borderColor: colors.natural[250],
    backgroundColor: colors.natural[150],
  },
  statusChipText: {
    fontSize: typography.fontSize.body.small,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[500],
  },
  footer: {
    flexDirection: "row",
    gap: spacing[12],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[12],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[300],
    backgroundColor: backgrounds.card[1],
  },
  cancelBtnText: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[700],
  },
  saveBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[12],
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[500],
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
    color: "#fff",
  },
});

export default WhitelabelSubscriptionModal;

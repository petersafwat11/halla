import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUpdatePlan } from "../../../hooks/mutations/useAdminMutations";
import { useTranslation } from "../../../localization";
import {
  colors,
  spacing,
  borderRadius,
  textStyles,
  backgrounds,
  typography,
} from "../../../styles/tokens";

const InputField = ({ label, value, onChangeText, keyboardType = "default", placeholder, hint }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder || label}
      placeholderTextColor={colors.natural[350]}
    />
  </View>
);

const EditPlanModal = ({ visible, onClose, plan, onSave }) => {
  const { t } = useTranslation("admin");
  const updatePlan = useUpdatePlan();

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [oneTime, setOneTime] = useState("0");
  const [monthly, setMonthly] = useState("0");
  const [yearly, setYearly] = useState("0");
  const [maxGuests, setMaxGuests] = useState("100");
  const [maxEvents, setMaxEvents] = useState("1");
  const [maxEventsPerMonth, setMaxEventsPerMonth] = useState("10");
  const [isActive, setIsActive] = useState(true);

  const isSingleOrTrial = plan?.planType === "single_event" || plan?.planType === "trial";
  const isSubOrEnterprise = plan?.planType === "subscription" || plan?.planType === "enterprise";

  useEffect(() => {
    if (plan) {
      setNameEn(plan.nameEn || "");
      setNameAr(plan.nameAr || "");
      setOneTime(String(plan.pricing?.direct?.oneTime ?? 0));
      setMonthly(String(plan.pricing?.direct?.monthly ?? 0));
      setYearly(String(plan.pricing?.direct?.yearly ?? 0));
      setMaxGuests(String(plan.limits?.maxGuestsPerEvent ?? 100));
      setMaxEvents(String(plan.limits?.maxEvents ?? 1));
      setMaxEventsPerMonth(String(plan.limits?.maxEventsPerMonth ?? 10));
      setIsActive(plan.isActive !== undefined ? plan.isActive : true);
    }
  }, [plan]);

  const handleSave = async () => {
    if (!plan) return;
    try {
      const payload = {
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        pricing: {
          direct: {
            oneTime: parseFloat(oneTime) || 0,
            monthly: parseFloat(monthly) || 0,
            yearly: parseFloat(yearly) || 0,
          },
        },
        limits: {
          maxGuestsPerEvent: parseInt(maxGuests, 10) || 0,
          ...(isSingleOrTrial && { maxEvents: parseInt(maxEvents, 10) || 1 }),
          ...(isSubOrEnterprise && { maxEventsPerMonth: parseInt(maxEventsPerMonth, 10) }),
        },
        isActive,
      };
      await updatePlan.mutateAsync({ code: plan.code, data: payload });
      onSave();
    } catch {
      // error handled by mutation
    }
  };

  const handleClose = () => {
    if (!updatePlan.isPending) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={handleClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrapper}
        >
          <View style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{t("plans.editPlan")}</Text>
                {plan ? (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>{plan.nameEn}</Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose} disabled={updatePlan.isPending}>
                <Ionicons name="close" size={20} color={colors.natural[500]} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <InputField
                label={t("plans.fields.nameEn")}
                value={nameEn}
                onChangeText={setNameEn}
                placeholder="e.g. Monthly Pro"
              />
              <InputField
                label={t("plans.fields.nameAr")}
                value={nameAr}
                onChangeText={setNameAr}
                placeholder="e.g. شهري برو"
              />

              {/* Pricing */}
              <Text style={styles.sectionLabel}>{t("plans.sections.pricing")}</Text>

              {isSingleOrTrial && (
                <InputField
                  label={t("plans.fields.oneTimePrice")}
                  value={oneTime}
                  onChangeText={setOneTime}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  hint={t("plans.fields.hintFree")}
                />
              )}

              {isSubOrEnterprise && (
                <>
                  <InputField
                    label={t("plans.fields.monthlyPrice")}
                    value={monthly}
                    onChangeText={setMonthly}
                    keyboardType="decimal-pad"
                    placeholder="299"
                  />
                  <InputField
                    label={t("plans.fields.yearlyPrice")}
                    value={yearly}
                    onChangeText={setYearly}
                    keyboardType="decimal-pad"
                    placeholder="2990"
                  />
                </>
              )}

              {/* Limits */}
              <Text style={styles.sectionLabel}>{t("plans.sections.limits")}</Text>

              <InputField
                label={t("plans.details.maxGuests")}
                value={maxGuests}
                onChangeText={setMaxGuests}
                keyboardType="number-pad"
                placeholder="100"
              />

              {isSingleOrTrial && (
                <InputField
                  label={t("plans.details.maxEvents")}
                  value={maxEvents}
                  onChangeText={setMaxEvents}
                  keyboardType="number-pad"
                  placeholder="1"
                />
              )}

              {isSubOrEnterprise && (
                <InputField
                  label={t("plans.fields.maxEventsPerMonth")}
                  value={maxEventsPerMonth}
                  onChangeText={setMaxEventsPerMonth}
                  keyboardType="number-pad"
                  placeholder="-1"
                  hint={t("plans.fields.hintUnlimited")}
                />
              )}

              {/* Status toggle */}
              <Text style={styles.sectionLabel}>{t("common.status")}</Text>
              <View style={styles.statusToggleRow}>
                <TouchableOpacity
                  style={[styles.statusChip, isActive && styles.statusChipActive]}
                  onPress={() => setIsActive(true)}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={15}
                    color={isActive ? colors.natural[50] : colors.success[500]}
                  />
                  <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                    {t("common.active")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusChip, !isActive && styles.statusChipInactive]}
                  onPress={() => setIsActive(false)}
                >
                  <Ionicons
                    name="ban-outline"
                    size={15}
                    color={!isActive ? colors.natural[50] : colors.error[500]}
                  />
                  <Text style={[styles.statusChipText, !isActive && styles.statusChipTextActive]}>
                    {t("plans.fields.disabled")}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={updatePlan.isPending}
              >
                <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, updatePlan.isPending && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={updatePlan.isPending}
              >
                {updatePlan.isPending ? (
                  <ActivityIndicator size="small" color={colors.natural[50]} />
                ) : (
                  <Text style={styles.saveButtonText}>{t("plans.fields.saveChanges")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  overlayTouchable: {
    flex: 1,
  },
  sheetWrapper: {
    width: "100%",
  },
  sheet: {
    backgroundColor: backgrounds.card[1],
    borderTopLeftRadius: borderRadius[20],
    borderTopRightRadius: borderRadius[20],
    maxHeight: "90%",
  },

  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.natural[300],
    alignSelf: "center",
    marginTop: spacing[12],
    marginBottom: spacing[8],
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  headerText: {
    flex: 1,
    gap: spacing[4],
  },
  headerTitle: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
  },
  headerSubtitle: {
    ...textStyles.bodySmall,
    color: colors.natural[450],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius[8],
    backgroundColor: colors.natural[150],
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing[12],
  },

  // Form
  formScroll: {
    flexShrink: 1,
  },
  formContent: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[20],
    paddingBottom: spacing[8],
    gap: spacing[16],
  },
  sectionLabel: {
    ...textStyles.labelLarge,
    color: colors.natural[600],
    fontWeight: typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing[8],
    marginBottom: spacing[4],
  },

  // Input field
  fieldWrap: {
    gap: spacing[4],
  },
  fieldLabel: {
    ...textStyles.labelLarge,
    color: colors.natural[700],
    fontWeight: typography.fontWeight.medium,
  },
  fieldHint: {
    ...textStyles.bodySmall,
    color: colors.natural[400],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.natural[250],
    borderRadius: borderRadius[8],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    fontSize: 14,
    color: colors.natural[900],
    backgroundColor: colors.natural[50],
  },

  // Status toggle
  statusToggleRow: {
    flexDirection: "row",
    gap: spacing[12],
  },
  statusChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    paddingVertical: spacing[12],
    borderRadius: borderRadius[8],
    borderWidth: 1.5,
    borderColor: colors.natural[250],
    backgroundColor: colors.natural[150],
  },
  statusChipActive: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  statusChipInactive: {
    backgroundColor: colors.error[500],
    borderColor: colors.error[500],
  },
  statusChipText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[600],
  },
  statusChipTextActive: {
    color: colors.natural[50],
  },

  // Footer
  footer: {
    flexDirection: "row",
    gap: spacing[12],
    padding: spacing[20],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing[16],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[250],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.natural[150],
  },
  cancelButtonText: {
    ...textStyles.labelLarge,
    color: colors.natural[600],
    fontWeight: typography.fontWeight.semibold,
  },
  saveButton: {
    flex: 2,
    paddingVertical: spacing[16],
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: colors.primary[300],
  },
  saveButtonText: {
    ...textStyles.labelLarge,
    color: colors.natural[50],
    fontWeight: typography.fontWeight.semibold,
  },
});

export default EditPlanModal;

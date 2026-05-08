import React, { useState, useEffect, useCallback } from "react";
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
  Switch,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUpdatePlan } from "../../../hooks/mutations/useAdminMutations";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import {
  colors,
  spacing,
  borderRadius,
  textStyles,
  backgrounds,
  typography,
} from "../../../styles/tokens";

/**
 * Boolean feature flags persisted on `plan.features.*` (mirrors backend
 * `PlanModel.featuresSchema:13-54` — 18 toggles in canonical order).
 */
const FEATURE_TOGGLE_KEYS = [
  "hasInAppInvites",
  "hasWhatsAppInvites",
  "hasSMSInvites",
  "hasQRCode",
  "hasQRScanning",
  "hasFlexibleEntryMode",
  "hasStaffCheckIn",
  "hasStaffAssignment",
  "hasRSVPTracking",
  "hasAutoReminders",
  "hasEmailNotifications",
  "hasCustomWhatsAppNumber",
  "hasCompensationInvites",
  "hasBasicTemplates",
  "hasPremiumTemplates",
  "hasPostEventPage",
  "hasCustomReports",
  "hasWhatsAppSupport",
];

/**
 * Build form state from a plan record. Reads from the real backend
 * shape (`pricing.oneTime`, `limits.{maxEvents,maxInvitesPerEvent,
 * invitePool,durationDays,maxHosts}`, `features.*` 18 booleans + 2
 * numerics). Numbers stay numeric (or `null` for nullable limits);
 * we never seed string literals like `"100"` / `"299"`.
 */
const buildState = (plan) => ({
  nameAr: plan?.nameAr ?? "",
  nameEn: plan?.nameEn ?? "",
  descriptionAr: plan?.descriptionAr ?? "",
  descriptionEn: plan?.descriptionEn ?? "",
  oneTime: plan?.pricing?.oneTime ?? 0,
  maxEvents: plan?.limits?.maxEvents ?? 1,
  maxInvitesPerEvent: plan?.limits?.maxInvitesPerEvent ?? null,
  invitePool: plan?.limits?.invitePool ?? null,
  durationDays: plan?.limits?.durationDays ?? 90,
  maxHosts: plan?.limits?.maxHosts ?? null,
  features: FEATURE_TOGGLE_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: plan?.features?.[key] ?? false }),
    {},
  ),
  compensationPercentage: plan?.features?.compensationPercentage ?? 10,
  priorityPoints: plan?.features?.priorityPoints ?? 1,
  isPopular: plan?.isPopular ?? false,
  sortOrder: plan?.sortOrder ?? 0,
  isActive: plan?.isActive !== false,
  isPublic: plan?.isPublic !== false,
});

/**
 * Coerce text-input value to a number or `null` (empty string ⇒ null).
 * Plain `Number("")` is `0` which would silently overwrite "unset" —
 * keep null sentinel instead so the backend nullable schema stays happy.
 */
const toNum = (txt) => {
  if (txt === "" || txt == null) return null;
  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
};

const NumberField = ({ label, value, onChangeText, placeholder, hint }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    <TextInput
      style={styles.input}
      value={value == null ? "" : String(value)}
      onChangeText={onChangeText}
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor={colors.natural[350]}
    />
  </View>
);

const TextField = ({ label, value, onChangeText, placeholder, multiline }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor={colors.natural[350]}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
    />
  </View>
);

const SwitchRow = ({ label, value, onValueChange }) => (
  <View style={styles.switchRow}>
    <Text style={styles.switchLabel}>{label}</Text>
    <Switch
      value={!!value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.natural[250], true: colors.primary[400] }}
      thumbColor={value ? colors.primary[500] : colors.natural[150]}
    />
  </View>
);

const EditPlanModal = ({ visible, onClose, plan, onSave }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const updatePlan = useUpdatePlan();

  const [form, setForm] = useState(() => buildState(plan));

  useEffect(() => {
    if (plan) setForm(buildState(plan));
  }, [plan]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFeature = useCallback((key, value) => {
    setForm((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }));
  }, []);

  const handleSave = async () => {
    if (!plan?.code) return;
    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      toast.warning(t("plans.fields.nameAr") + " / " + t("plans.fields.nameEn"));
      return;
    }
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        descriptionAr: form.descriptionAr,
        descriptionEn: form.descriptionEn,
        pricing: { oneTime: Number(form.oneTime) || 0 },
        limits: {
          maxEvents: Number(form.maxEvents),
          maxInvitesPerEvent: form.maxInvitesPerEvent,
          invitePool: form.invitePool,
          durationDays: Number(form.durationDays),
          maxHosts: form.maxHosts,
        },
        features: {
          ...form.features,
          compensationPercentage: Number(form.compensationPercentage) || 0,
          priorityPoints: Number(form.priorityPoints) || 1,
        },
        isPopular: !!form.isPopular,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: !!form.isActive,
        isPublic: !!form.isPublic,
      };
      await updatePlan.mutateAsync({ code: plan.code, data: payload });
      toast.success(t("common.success"));
      if (onSave) onSave();
    } catch (err) {
      toast.error(err?.message || t("common.error"));
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
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {plan.nameEn}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                disabled={updatePlan.isPending}
              >
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
              {/* ── Identity (read-only chips) ── */}
              <Text style={styles.sectionLabel}>{t("plans.sections.identity")}</Text>
              <View style={styles.identityRow}>
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>{t("plans.fields.code")}</Text>
                  <Text style={styles.chipValue}>{plan?.code || "—"}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>{t("plans.fields.planType")}</Text>
                  <Text style={styles.chipValue}>{plan?.planType || "—"}</Text>
                </View>
              </View>

              {/* ── Naming ── */}
              <Text style={styles.sectionLabel}>{t("plans.sections.naming")}</Text>
              <TextField
                label={t("plans.fields.nameAr")}
                value={form.nameAr}
                onChangeText={(v) => setField("nameAr", v)}
              />
              <TextField
                label={t("plans.fields.nameEn")}
                value={form.nameEn}
                onChangeText={(v) => setField("nameEn", v)}
              />

              {/* ── Description ── */}
              <Text style={styles.sectionLabel}>{t("plans.sections.description")}</Text>
              <TextField
                label={t("plans.fields.descriptionAr")}
                value={form.descriptionAr}
                onChangeText={(v) => setField("descriptionAr", v)}
                multiline
              />
              <TextField
                label={t("plans.fields.descriptionEn")}
                value={form.descriptionEn}
                onChangeText={(v) => setField("descriptionEn", v)}
                multiline
              />

              {/* ── Pricing ── */}
              <Text style={styles.sectionLabel}>{t("plans.sections.pricing")}</Text>
              <NumberField
                label={t("plans.fields.oneTimePrice")}
                value={form.oneTime}
                onChangeText={(txt) => setField("oneTime", toNum(txt) ?? 0)}
                placeholder="0"
                hint={t("plans.fields.hintFree")}
              />

              {/* ── Limits ── */}
              <Text style={styles.sectionLabel}>{t("plans.sections.limits")}</Text>
              <NumberField
                label={t("plans.fields.maxEvents")}
                value={form.maxEvents}
                onChangeText={(txt) => setField("maxEvents", toNum(txt) ?? 1)}
                placeholder="1"
                hint={t("plans.fields.maxEventsHint")}
              />
              <NumberField
                label={t("plans.fields.maxInvitesPerEvent")}
                value={form.maxInvitesPerEvent}
                onChangeText={(txt) => setField("maxInvitesPerEvent", toNum(txt))}
                placeholder={t("plans.fields.unlimited")}
              />
              <NumberField
                label={t("plans.fields.invitePool")}
                value={form.invitePool}
                onChangeText={(txt) => setField("invitePool", toNum(txt))}
                placeholder={t("plans.fields.unlimited")}
              />
              <NumberField
                label={t("plans.fields.durationDays")}
                value={form.durationDays}
                onChangeText={(txt) => setField("durationDays", toNum(txt) ?? 0)}
                placeholder="90"
              />
              <NumberField
                label={t("plans.fields.maxHosts")}
                value={form.maxHosts}
                onChangeText={(txt) => setField("maxHosts", toNum(txt))}
                placeholder={t("plans.fields.unlimited")}
              />

              {/* ── Feature toggles ── */}
              <Text style={styles.sectionLabel}>{t("plans.sections.featureToggles")}</Text>
              <View style={styles.toggleGroup}>
                {FEATURE_TOGGLE_KEYS.map((key) => (
                  <SwitchRow
                    key={key}
                    label={t(`plans.features.${key}`)}
                    value={form.features[key]}
                    onValueChange={(v) => setFeature(key, v)}
                  />
                ))}
              </View>

              {/* ── Feature numerics ── */}
              <Text style={styles.sectionLabel}>{t("plans.sections.featureNumerics")}</Text>
              <NumberField
                label={t("plans.fields.compensationPercentage")}
                value={form.compensationPercentage}
                onChangeText={(txt) => setField("compensationPercentage", toNum(txt) ?? 0)}
                placeholder="10"
                hint={t("plans.fields.compensationHint")}
              />
              <NumberField
                label={t("plans.fields.priorityPoints")}
                value={form.priorityPoints}
                onChangeText={(txt) => setField("priorityPoints", toNum(txt) ?? 1)}
                placeholder="1"
                hint={t("plans.fields.priorityHint")}
              />

              {/* ── Display ── */}
              <Text style={styles.sectionLabel}>{t("plans.sections.display")}</Text>
              <SwitchRow
                label={t("plans.fields.isPopular")}
                value={form.isPopular}
                onValueChange={(v) => setField("isPopular", v)}
              />
              <NumberField
                label={t("plans.fields.sortOrder")}
                value={form.sortOrder}
                onChangeText={(txt) => setField("sortOrder", toNum(txt) ?? 0)}
                placeholder="0"
              />

              {/* ── Visibility ── */}
              <Text style={styles.sectionLabel}>{t("plans.sections.visibility")}</Text>
              <SwitchRow
                label={t("plans.fields.isActive")}
                value={form.isActive}
                onValueChange={(v) => setField("isActive", v)}
              />
              <SwitchRow
                label={t("plans.fields.isPublic")}
                value={form.isPublic}
                onValueChange={(v) => setField("isPublic", v)}
              />
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
  overlayTouchable: { flex: 1 },
  sheetWrapper: { width: "100%" },
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
  headerText: { flex: 1, gap: spacing[4] },
  headerTitle: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
  },
  headerSubtitle: { ...textStyles.bodySmall, color: colors.natural[450] },
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
  formScroll: { flexShrink: 1 },
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

  // Identity chips
  identityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  chip: {
    flexGrow: 1,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: borderRadius[8],
    backgroundColor: colors.natural[150],
    borderWidth: 1,
    borderColor: colors.natural[250],
    gap: 2,
  },
  chipLabel: {
    fontSize: 11,
    color: colors.natural[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipValue: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[800],
  },

  // Field
  fieldWrap: { gap: spacing[4] },
  fieldLabel: {
    ...textStyles.labelLarge,
    color: colors.natural[700],
    fontWeight: typography.fontWeight.medium,
  },
  fieldHint: { ...textStyles.bodySmall, color: colors.natural[400] },
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
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },

  // Switches
  toggleGroup: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    paddingHorizontal: spacing[12],
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[10],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.natural[200],
    gap: spacing[12],
  },
  switchLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.natural[800],
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
  saveButtonDisabled: { backgroundColor: colors.primary[300] },
  saveButtonText: {
    ...textStyles.labelLarge,
    color: colors.natural[50],
    fontWeight: typography.fontWeight.semibold,
  },
});

export default EditPlanModal;

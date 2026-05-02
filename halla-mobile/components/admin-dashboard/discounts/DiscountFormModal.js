import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { useCreateDiscount, useUpdateDiscount } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const EMPTY_FORM = {
  code: "",
  descriptionEn: "",
  descriptionAr: "",
  discountType: "percentage",
  value: "",
  maxUses: "0",
  validFrom: "",
  validUntil: "",
  minimumAmount: "0",
  isActive: true,
};

const DiscountFormModal = ({ visible, discount, onClose, onSave }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();

  const [form, setForm] = useState(EMPTY_FORM);

  const isEdit = !!discount;
  const isPending = createDiscount.isPending || updateDiscount.isPending;

  useEffect(() => {
    if (visible) {
      if (discount) {
        setForm({
          code: discount.code || "",
          descriptionEn: discount.descriptionEn || "",
          descriptionAr: discount.descriptionAr || "",
          discountType: discount.discountType || "percentage",
          value: String(discount.value || ""),
          maxUses: String(discount.maxUses ?? 0),
          validFrom: discount.validFrom
            ? new Date(discount.validFrom).toISOString().split("T")[0]
            : "",
          validUntil: discount.validUntil
            ? new Date(discount.validUntil).toISOString().split("T")[0]
            : "",
          minimumAmount: String(discount.minimumAmount ?? 0),
          isActive: discount.isActive !== false,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [visible, discount]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.code.trim()) {
      toast.error(t("discounts.errors.codeRequired"));
      return false;
    }
    if (!form.value.trim()) {
      toast.error(t("discounts.errors.valueRequired"));
      return false;
    }
    if (isNaN(parseFloat(form.value)) || parseFloat(form.value) <= 0) {
      toast.error(t("discounts.errors.valueInvalid"));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const payload = {
      code: form.code.trim().toUpperCase(),
      descriptionEn: form.descriptionEn.trim(),
      descriptionAr: form.descriptionAr.trim(),
      discountType: form.discountType,
      value: parseFloat(form.value),
      maxUses: parseInt(form.maxUses) || 0,
      validFrom: form.validFrom || undefined,
      validUntil: form.validUntil || undefined,
      minimumAmount: parseFloat(form.minimumAmount) || 0,
      isActive: form.isActive,
    };

    try {
      if (isEdit) {
        await updateDiscount.mutateAsync({ id: discount.id, data: payload });
        toast.success(t("discounts.success.updated"));
      } else {
        await createDiscount.mutateAsync(payload);
        toast.success(t("discounts.success.created"));
      }
      onSave?.();
      onClose();
    } catch (err) {
      toast.error(
        isEdit
          ? t("discounts.errors.updateFailed")
          : t("discounts.errors.createFailed")
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEdit ? t("discounts.form.editTitle") : t("discounts.form.createTitle")}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.natural[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Code (readonly in edit) */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("discounts.form.code")}</Text>
              <TextInput
                style={[styles.input, isEdit && styles.inputDisabled]}
                value={form.code}
                onChangeText={(v) => set("code", v.toUpperCase())}
                placeholder={t("discounts.form.codePlaceholder")}
                placeholderTextColor={colors.natural[300]}
                autoCapitalize="characters"
                editable={!isEdit}
              />
            </View>

            {/* Discount Type */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("discounts.form.discountType")}</Text>
              <View style={styles.typeRow}>
                {["percentage", "fixed"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeBtn,
                      form.discountType === type && styles.typeBtnActive,
                    ]}
                    onPress={() => set("discountType", type)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        form.discountType === type && styles.typeBtnTextActive,
                      ]}
                    >
                      {t(`discounts.form.${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Value */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("discounts.form.value")}</Text>
              <TextInput
                style={styles.input}
                value={form.value}
                onChangeText={(v) => set("value", v)}
                placeholder={t("discounts.form.valuePlaceholder")}
                placeholderTextColor={colors.natural[300]}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Max Uses */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("discounts.form.maxUses")}</Text>
              <TextInput
                style={styles.input}
                value={form.maxUses}
                onChangeText={(v) => set("maxUses", v)}
                placeholder={t("discounts.form.maxUsesPlaceholder")}
                placeholderTextColor={colors.natural[300]}
                keyboardType="number-pad"
              />
            </View>

            {/* Minimum Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("discounts.form.minimumAmount")}</Text>
              <TextInput
                style={styles.input}
                value={form.minimumAmount}
                onChangeText={(v) => set("minimumAmount", v)}
                placeholder={t("discounts.form.minimumAmountPlaceholder")}
                placeholderTextColor={colors.natural[300]}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Valid From */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("discounts.form.validFrom")}</Text>
              <TextInput
                style={styles.input}
                value={form.validFrom}
                onChangeText={(v) => set("validFrom", v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.natural[300]}
              />
            </View>

            {/* Valid Until */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("discounts.form.validUntil")}</Text>
              <TextInput
                style={styles.input}
                value={form.validUntil}
                onChangeText={(v) => set("validUntil", v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.natural[300]}
              />
            </View>

            {/* Description EN */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("discounts.form.descriptionEn")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.descriptionEn}
                onChangeText={(v) => set("descriptionEn", v)}
                placeholder={t("discounts.form.descriptionEnPlaceholder")}
                placeholderTextColor={colors.natural[300]}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Description AR */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("discounts.form.descriptionAr")}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.descriptionAr}
                onChangeText={(v) => set("descriptionAr", v)}
                placeholder={t("discounts.form.descriptionArPlaceholder")}
                placeholderTextColor={colors.natural[300]}
                multiline
                numberOfLines={2}
                textAlign="right"
              />
            </View>

            {/* Is Active Toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.label}>{t("discounts.form.isActive")}</Text>
              <Switch
                value={form.isActive}
                onValueChange={(v) => set("isActive", v)}
                trackColor={{ false: colors.natural[200], true: colors.primary[400] }}
                thumbColor={form.isActive ? colors.primary[500] : colors.natural[300]}
              />
            </View>
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>{t("discounts.form.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isPending && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : null}
              <Text style={styles.saveBtnText}>
                {isPending ? t("discounts.form.saving") : t("discounts.form.save")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.large,
    color: colors.natural[900],
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: spacing[20],
    gap: spacing[4],
  },
  field: {
    marginBottom: spacing[16],
  },
  label: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.large,
    color: colors.natural[600],
    marginBottom: spacing[6],
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.natural[200],
    borderRadius: borderRadius[8],
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[900],
    backgroundColor: "#FFF",
  },
  inputDisabled: {
    backgroundColor: colors.natural[50],
    color: colors.natural[400],
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  typeRow: {
    flexDirection: "row",
    gap: spacing[10],
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing[10],
    borderRadius: borderRadius[8],
    borderWidth: 1.5,
    borderColor: colors.natural[200],
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  typeBtnActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  typeBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.large,
    color: colors.natural[600],
  },
  typeBtnTextActive: {
    color: "#FFF",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[16],
  },
  footer: {
    flexDirection: "row",
    gap: spacing[12],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colors.natural[100],
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing[14],
    borderRadius: borderRadius[10],
    borderWidth: 1.5,
    borderColor: colors.natural[200],
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[600],
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    gap: spacing[6],
    paddingVertical: spacing[14],
    borderRadius: borderRadius[10],
    backgroundColor: colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    backgroundColor: colors.natural[300],
  },
  saveBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: "#FFF",
  },
});

export default DiscountFormModal;

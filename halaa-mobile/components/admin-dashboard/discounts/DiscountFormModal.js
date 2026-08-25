import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import KeyboardSafeModalSheet from "../../commen/keyboard/KeyboardSafeModalSheet";
import { useTranslation } from "../../../localization";
import { useCreateDiscount, useUpdateDiscount } from "../../../hooks";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/commen";
import LocalizedText from "../../commen/LocalizedText";
import DiscountFormFields from "./_components/DiscountFormFields";
import { discountSchema } from "@halaa/shared/schemas/admin";
import { buildPayload } from "./discountsFormUtils";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  backgrounds,
} from "../../../styles/tokens";

const DiscountFormModal = ({ visible, discount, onClose, onSave }) => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();

  const isEdit = !!discount;
  const isPending = createDiscount.isPending || updateDiscount.isPending;

  const methods = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: "",
      descriptionEn: "",
      descriptionAr: "",
      discountType: "percentage",
      value: "",
      maxUses: "",
      validFrom: null,
      validUntil: null,
      minimumAmount: "",
      isActive: true,
      applicablePlanTypes: [],
    },
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    if (visible) {
      if (discount) {
        reset({
          code: discount.code || "",
          descriptionEn: discount.descriptionEn || "",
          descriptionAr: discount.descriptionAr || "",
          discountType: discount.discountType || "percentage",
          value: String(discount.value ?? ""),
          maxUses: String(discount.maxUses ?? ""),
          validFrom: discount.validFrom ? new Date(discount.validFrom) : null,
          validUntil: discount.validUntil ? new Date(discount.validUntil) : null,
          minimumAmount: String(discount.minimumAmount ?? ""),
          isActive: discount.isActive !== false,
          applicablePlanTypes: discount.applicablePlanTypes || [],
        });
      } else {
        reset({
          code: "",
          descriptionEn: "",
          descriptionAr: "",
          discountType: "percentage",
          value: "",
          maxUses: "",
          validFrom: null,
          validUntil: null,
          minimumAmount: "",
          isActive: true,
          applicablePlanTypes: [],
        });
      }
    }
  }, [visible, discount, reset]);

  const handleSave = async (data) => {
    const payload = buildPayload(data);

    try {
      if (isEdit) {
        const { code: _ignored, ...updateData } = payload;
        await updateDiscount.mutateAsync({ id: discount.id, data: updateData });
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

  const handleClose = () => {
    reset();
    onClose();
  };

  const header = (
    <View style={styles.header}>
      <LocalizedText role="sectionTitle" style={styles.title}>
        {isEdit ? t("discounts.form.editTitle") : t("discounts.form.createTitle")}
      </LocalizedText>
      <TouchableOpacity
        onPress={handleClose}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("discounts.form.cancel")}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {/* Close is semantic — never mirrored. */}
        <Ionicons name="close" size={22} color={colors.natural[600]} />
      </TouchableOpacity>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <View style={styles.buttonWrapper}>
        <Button
          text={t("discounts.form.cancel")}
          onPress={handleClose}
          variant="outline"
          size="small"
          disabled={isPending}
        />
      </View>
      <View style={styles.buttonWrapper}>
        <Button
          text={isPending ? t("discounts.form.saving") : t("discounts.form.save")}
          onPress={handleSubmit(handleSave)}
          variant="primary"
          size="small"
          loading={isPending}
        />
      </View>
    </View>
  );

  return (
    // Shared sheet (§8.2 admin row): aware scroll body owns focus scrolling;
    // actions stay attached above the keyboard.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={handleClose}
      onRequestClose={handleClose}
      header={header}
      footer={footer}
      contentContainerStyle={styles.bodyContent}
      sheetStyle={styles.sheetBg}
    >
      <FormProvider {...methods}>
        <DiscountFormFields isEdit={isEdit} />
        <View style={styles.spacingHelper} />
      </FormProvider>
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: backgrounds.card[1],
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
  bodyContent: {
    padding: spacing[20],
    gap: spacing[4],
  },
  spacingHelper: {
    height: spacing[40],
  },
  footer: {
    flexDirection: "row",
    gap: spacing[12],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colors.natural[100],
  },
  buttonWrapper: {
    flex: 1,
  },
});

export default DiscountFormModal;

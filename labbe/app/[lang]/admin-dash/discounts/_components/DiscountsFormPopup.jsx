"use client";

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import { useCreateDiscount, useUpdateDiscount } from "@/hooks/discounts";
import DiscountsFormFields from "./DiscountsFormFields";
import { buildPayload } from "./discountsFormUtils";
import { discountSchema } from "@halla/shared/schemas/admin";
import styles from "./DiscountsFormPopup.module.css";

export default function DiscountsFormPopup({ isOpen, onClose, editingDiscount }) {
  const { t } = useTranslation("adminDiscounts");

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
      isActive: true,
      applicablePlanTypes: [],
      minimumAmount: "",
    },
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    if (isOpen) {
      if (editingDiscount) {
        reset({
          code: editingDiscount.code || "",
          descriptionEn: editingDiscount.descriptionEn || "",
          descriptionAr: editingDiscount.descriptionAr || "",
          discountType: editingDiscount.discountType || "percentage",
          value: editingDiscount.value ?? "",
          maxUses: editingDiscount.maxUses ?? "",
          validFrom: editingDiscount.validFrom
            ? new Date(editingDiscount.validFrom)
            : null,
          validUntil: editingDiscount.validUntil
            ? new Date(editingDiscount.validUntil)
            : null,
          isActive: editingDiscount.isActive ?? true,
          applicablePlanTypes: editingDiscount.applicablePlanTypes || [],
          minimumAmount: editingDiscount.minimumAmount ?? "",
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
          isActive: true,
          applicablePlanTypes: [],
          minimumAmount: "",
        });
      }
    }
  }, [editingDiscount, isOpen, reset]);

  const createMutation = useCreateDiscount();
  const updateMutation = useUpdateDiscount();

  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data) => {
    const payload = buildPayload(data);

    const onSuccess = (msgKey, fallback) => {
      toastUtils.success(t(msgKey, fallback));
      onClose();
    };

    if (editingDiscount) {
      const { code: _ignored, ...updateData } = payload;
      updateMutation.mutate(
        { id: editingDiscount.id, data: updateData },
        {
          onSuccess: () => onSuccess("discounts.updateSuccess", "تم تحديث الكود"),
          onError: (err) =>
            handleError(err, t, { fallbackMessage: "discounts.updateError" }),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onSuccess("discounts.createSuccess", "تم إنشاء الكود"),
        onError: (err) =>
          handleError(err, t, { fallbackMessage: "discounts.createError" }),
      });
    }
  };

  return (
    <PopupLayout isOpen={isOpen} onClose={onClose} size="auto">
      <div className={styles.modal}>
        <h2 className={styles.title}>
          {editingDiscount
            ? t("discounts.editTitle", "تعديل كود الخصم")
            : t("discounts.createTitle", "إنشاء كود خصم جديد")}
        </h2>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <DiscountsFormFields editingDiscount={editingDiscount} />

            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("discounts.cancel", "إلغاء")}
                onClick={onClose}
                disabled={saving}
                type="button"
              />
              <Button
                variant="primary"
                title={
                  saving
                    ? t("discounts.saving", "جاري الحفظ...")
                    : editingDiscount
                    ? t("discounts.saveChanges", "حفظ التعديلات")
                    : t("discounts.create", "إنشاء الكود")
                }
                type="submit"
                disabled={saving}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}

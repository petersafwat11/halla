"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import { useCreateDiscount, useUpdateDiscount } from "@/hooks/reactQueryHooks/useDiscounts";
import DiscountsFormFields from "./DiscountsFormFields";
import { EMPTY_FORM, validateForm, buildPayload } from "./discountsFormUtils";
import styles from "./DiscountsFormPopup.module.css";

export default function DiscountsFormPopup({ isOpen, onClose, editingDiscount }) {
  const { t } = useTranslation("adminDashboard");

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingDiscount) {
      setForm({
        code: editingDiscount.code || "",
        descriptionEn: editingDiscount.descriptionEn || "",
        descriptionAr: editingDiscount.descriptionAr || "",
        discountType: editingDiscount.discountType || "percentage",
        value: editingDiscount.value ?? "",
        maxUses: editingDiscount.maxUses ?? "",
        validFrom: editingDiscount.validFrom
          ? new Date(editingDiscount.validFrom).toISOString().slice(0, 10)
          : "",
        validUntil: editingDiscount.validUntil
          ? new Date(editingDiscount.validUntil).toISOString().slice(0, 10)
          : "",
        isActive: editingDiscount.isActive ?? true,
        applicablePlanTypes: editingDiscount.applicablePlanTypes || [],
        minimumAmount: editingDiscount.minimumAmount ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [editingDiscount, isOpen]);

  const createMutation = useCreateDiscount();
  const updateMutation = useUpdateDiscount();

  const saving = createMutation.isPending || updateMutation.isPending;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const togglePlanType = (type) =>
    setForm((prev) => ({
      ...prev,
      applicablePlanTypes: prev.applicablePlanTypes.includes(type)
        ? prev.applicablePlanTypes.filter((x) => x !== type)
        : [...prev.applicablePlanTypes, type],
    }));

  const handleSubmit = () => {
    const e = validateForm(form, t);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    const payload = buildPayload(form);

    const onSuccess = (msgKey, fallback) => {
      toastUtils.success(t(msgKey, fallback));
      onClose();
    };

    if (editingDiscount) {
      // Update payload: drop the immutable `code` so the strict Zod schema
      // doesn't reject it.
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

        <DiscountsFormFields
          form={form}
          errors={errors}
          set={set}
          togglePlanType={togglePlanType}
          editingDiscount={editingDiscount}
        />

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            {t("discounts.cancel", "إلغاء")}
          </button>
          <button className={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
            {saving
              ? t("discounts.saving", "جاري الحفظ...")
              : editingDiscount
              ? t("discounts.saveChanges", "حفظ التعديلات")
              : t("discounts.create", "إنشاء الكود")}
          </button>
        </div>
      </div>
    </PopupLayout>
  );
}

"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminVendorMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import StarRating from "@/ui/commen/inputs/starRating/StarRating";
import { vendorRatingSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./VendorRatingPopup.module.css";

export default function VendorRatingPopup({ vendor, onClose }) {
  const { t } = useTranslation("adminDashboard");
  const updateRating = useAdminVendorMutation("updateRating");

  const methods = useForm({
    resolver: zodResolver(vendorRatingSchema),
    defaultValues: { rating: vendor?.rating || 0 },
  });

  const onSubmit = async (data) => {
    try {
      await updateRating.mutateAsync({
        vendorId: vendor.id || vendor._id,
        rating: data.rating,
      });
      toast.success(t("vendors.ratingUpdateSuccess", "تم تحديث التقييم بنجاح"));
      onClose();
    } catch (error) {
      toast.error(error.message || t("vendors.ratingUpdateError", "فشل تحديث التقييم"));
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("vendors.updateRating", "تحديث التقييم")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label>{t("vendors.form.vendorName", "اسم التاجر")}</label>
              <input type="text" value={vendor?.username || vendor?.name || ""} disabled style={{ background: "#f5f5f5" }} />
            </div>
            <StarRating
              name="rating"
              label={t("vendors.form.rating", "التقييم")}
              required
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("common.cancel", "إلغاء")}
                onClick={onClose}
                disabled={updateRating.isPending}
              />
              <Button
                variant="primary"
                title={updateRating.isPending ? t("common.loading", "جاري التحديث...") : t("common.update", "تحديث")}
                type="submit"
                disabled={updateRating.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}

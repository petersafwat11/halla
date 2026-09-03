"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminVendorMutation } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import StarRating from "@/ui/commen/inputs/starRating/StarRating";
import { vendorRatingSchema } from "@halaa/shared/schemas/admin";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import { FiX } from "react-icons/fi";
import styles from "./VendorRatingPopup.module.css";

export default function VendorRatingPopup({ vendor, onClose }) {
  const { t } = useTranslation("adminVendors");
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
      toastUtils.success(t("giveRating.success"));
      onClose();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "giveRating.error" });
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("giveRating.title")}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t("dateRange.cancel")}>
            <FiX size={24} />
          </button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label>{t("table.columns.name") || "Vendor"}</label>
              <input
                type="text"
                value={vendor?.name || vendor?.brandName || ""}
                disabled
                className={styles.inputDisabled}
              />
            </div>
            <StarRating
              name="rating"
              label={t("giveRating.ratingLabel")}
              required
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("dateRange.cancel")}
                onClick={onClose}
                disabled={updateRating.isPending}
              />
              <Button
                variant="primary"
                title={updateRating.isPending ? t("giveRating.submitting") : t("giveRating.submitButton")}
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

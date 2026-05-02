"use client";
import React, { useState } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import Image from "next/image";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import { editPlanSchema } from "@/utils/schemas/planSchema";
import { plansAPI } from "@/services/adminDashboard";
import Button from "@/ui/commen/button/Button";
import styles from "./EditPlanPopup.module.css";

const EditPlanPopup = ({ plan, onClose, onSuccess, planType }) => {
  const { t, i18n } = useTranslation("admin");
  const [isLoading, setIsLoading] = useState(false);
  const isArabic = i18n.language === "ar";

  const planType = plan?.planType || "";
  const isPoolPlanType = ['basic_monthly', 'premium_monthly', 'business_quarterly', 'business_annual'].includes(planType);
  const showInvitePool = isPoolPlanType;
  const showMaxInvitesPerEvent = !isPoolPlanType;

  const methods = useForm({
    resolver: zodResolver(editPlanSchema),
    defaultValues: {
      nameAr: plan?.nameAr || "",
      nameEn: plan?.nameEn || "",
      pricing: {
        oneTime: plan?.pricing?.oneTime || 0,
      },
      limits: {
        maxEvents: plan?.limits?.maxEvents || 1,
        maxInvitesPerEvent: plan?.limits?.maxInvitesPerEvent || null,
        invitePool: plan?.limits?.invitePool || null,
        durationDays: plan?.limits?.durationDays || 90,
      },
      isActive: plan?.isActive !== false,
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = methods;

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await plansAPI.updatePlan(plan.code, data);
      toast.success(
        isArabic ? "تم حفظ التغييرات بنجاح" : "Changes saved successfully",
      );
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error(
        error.message ||
          (isArabic ? "فشل في حفظ التغييرات" : "Failed to save changes"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.headerTitle}>
            {isArabic ? "تعديل الباقة" : "Edit Plan"}
          </h2>
          <span className={styles.planCode}>{plan?.code}</span>
        </div>
        <button onClick={onClose} className={styles.closeButton}>
          <Image
            width={24}
            height={24}
            src="/svg/admin/close.svg"
            alt="close"
          />
        </button>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.body}>
          {/* Plan Names */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {isArabic ? "معلومات الباقة" : "Plan Information"}
            </h3>
            <div className={styles.row}>
              <Controller
                name="nameAr"
                control={control}
                render={({ field }) => (
                  <InputGroup
                    label={isArabic ? "الاسم بالعربية" : "Arabic Name"}
                    placeholder={
                      isArabic ? "ادخل الاسم بالعربية" : "Enter Arabic name"
                    }
                    type="text"
                    name="nameAr"
                    hintMessage={errors.nameAr?.message}
                    required={true}
                    error={!!errors.nameAr}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="nameEn"
                control={control}
                render={({ field }) => (
                  <InputGroup
                    label={isArabic ? "الاسم بالإنجليزية" : "English Name"}
                    placeholder={
                      isArabic ? "ادخل الاسم بالإنجليزية" : "Enter English name"
                    }
                    type="text"
                    name="nameEn"
                    hintMessage={errors.nameEn?.message}
                    required={true}
                    error={!!errors.nameEn}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {isArabic ? "التسعير" : "Pricing"}
            </h3>
            <div className={styles.row}>
              <Controller
                name="pricing.oneTime"
                control={control}
                render={({ field }) => (
                  <InputGroup
                    label={isArabic ? "سعر المناسبة الواحدة" : "One-time Price"}
                    placeholder="0"
                    type="number"
                    name="pricing.oneTime"
                    hintMessage={errors.pricing?.oneTime?.message}
                    error={!!errors.pricing?.oneTime}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    prefixText="SAR"
                  />
                )}
              />
            </div>
          </div>

          {/* Limits Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {isArabic ? "الحدود" : "Limits"}
            </h3>
            <div className={styles.row}>
              {showInvitePool && (
                <Controller
                  name="limits.invitePool"
                  control={control}
                  render={({ field }) => (
                    <InputGroup
                      label={isArabic ? "مجموع الدعوات" : "Invite Pool"}
                      placeholder="0"
                      type="number"
                      name="limits.invitePool"
                      hintMessage={errors.limits?.invitePool?.message}
                      error={!!errors.limits?.invitePool}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
              )}
              {showMaxInvitesPerEvent && (
                <Controller
                  name="limits.maxInvitesPerEvent"
                  control={control}
                  render={({ field }) => (
                    <InputGroup
                      label={isArabic ? "الحد الأقصى للدعوات" : "Max Invites per Event"}
                      placeholder="50"
                      type="number"
                      name="limits.maxInvitesPerEvent"
                      hintMessage={errors.limits?.maxInvitesPerEvent?.message}
                      error={!!errors.limits?.maxInvitesPerEvent}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
              )}
              <Controller
                name="limits.maxEvents"
                control={control}
                render={({ field }) => (
                  <InputGroup
                    label={isArabic ? "عدد المناسبات" : "Max Events"}
                    placeholder="1"
                    type="number"
                    name="limits.maxEvents"
                    hintMessage={errors.limits?.maxEvents?.message}
                    error={!!errors.limits?.maxEvents}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              <Controller
                name="limits.durationDays"
                control={control}
                render={({ field }) => (
                  <InputGroup
                    label={isArabic ? "المدة (بالأيام)" : "Duration (days)"}
                    placeholder="90"
                    type="number"
                    name="limits.durationDays"
                    hintMessage={errors.limits?.durationDays?.message}
                    error={!!errors.limits?.durationDays}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
            </div>
          </div>

          {/* Active Status */}
          <div className={styles.section}>
            <ToggleInput
              name="isActive"
              label={isArabic ? "الباقة نشطة" : "Plan Active"}
              description={
                isArabic
                  ? "عند التعطيل، لن تظهر الباقة للمستخدمين الجدد"
                  : "When disabled, the plan won't be visible to new users"
              }
            />
          </div>

          <div className={styles.footer}>
            <Button
              variant="secondary"
              title={isArabic ? "إلغاء" : "Cancel"}
              onClick={onClose}
              disabled={isLoading}
            />
            <Button
              variant="primary"
              title={isLoading
                ? isArabic
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isArabic
                  ? "حفظ التغييرات"
                  : "Save Changes"}
              type="submit"
              disabled={isLoading || !isDirty}
            />
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default EditPlanPopup;
